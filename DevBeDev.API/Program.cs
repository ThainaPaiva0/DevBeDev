using System.Text;
using DevBeDev.API.Data;
using DevBeDev.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver;
using NSwag;
using NSwag.Generation.Processors.Security;

var builder = WebApplication.CreateBuilder(args);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// 1. Configurar MongoDB (MongoDB Atlas / DevBeDevNoSQL)
var mongoConnectionString = builder.Configuration["MongoDbSettings:ConnectionString"]
    ?? Environment.GetEnvironmentVariable("MongoDbSettings__ConnectionString")
    ?? "mongodb://localhost:27017";
var mongoDatabaseName = builder.Configuration["MongoDbSettings:DatabaseName"]
    ?? Environment.GetEnvironmentVariable("MongoDbSettings__DatabaseName")
    ?? "DevBeDevNoSQL";

var mongoClientSettings = MongoClientSettings.FromConnectionString(mongoConnectionString);
mongoClientSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
mongoClientSettings.ConnectTimeout = TimeSpan.FromSeconds(5);
builder.Services.AddSingleton<IMongoClient>(new MongoClient(mongoClientSettings));

// 2. Configurar PostgreSQL via Npgsql
var postgresConnectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? builder.Configuration["ConnectionStrings:DefaultConnection"]
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' não configurada.");

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(postgresConnectionString));

// 3. Configurar limite de multipart/form-data para uploads Web e Mobile
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104_857_600; // 100 MB
});

// 4. Configurar CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// 5. Configurar Swagger com NSwag
builder.Services.AddOpenApiDocument(config =>
{
    config.Title = "DevBeDev.API";
    config.Version = "v1";

    config.AddSecurity("Bearer", Enumerable.Empty<string>(), new OpenApiSecurityScheme
    {
        Type = OpenApiSecuritySchemeType.ApiKey,
        Name = "Authorization",
        In = OpenApiSecurityApiKeyLocation.Header,
        Description = "Insira o token JWT desta forma: Bearer {seu_token}"
    });

    config.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("Bearer"));
});

// 6. Injeção de Dependência dos Serviços
builder.Services.AddScoped<CloudinaryService>();
builder.Services.AddScoped<ComentarioService>();
builder.Services.AddScoped<MensagemService>();
builder.Services.AddScoped<ProjetoService>();
builder.Services.AddScoped<UsuarioService>();

// 7. Configurar Autenticação JWT
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = builder.Configuration["Jwt:Key"]
    ?? Environment.GetEnvironmentVariable("Jwt__Key")
    ?? jwtSettings["SecretKey"]
    ?? "uma-chave-secreta-muito-segura-para-desenvolvimento-123";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"] ?? "DevBeDev.API",
        ValidAudience = jwtSettings["Audience"] ?? "DevBeDev.App",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi();
}

app.UseMiddleware<DevBeDev.API.Middlewares.ExceptionHandlingMiddleware>();

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/status", () => Results.Ok(new
{
    status = "online",
    servico = "DevBeDev.API",
    timestamp = DateTime.UtcNow
}));

using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        context.Database.Migrate();

        var adminExistente = context.Usuarios.FirstOrDefault(u => u.Email == "admin@devbedev.com");
        if (adminExistente == null)
        {
            var admin = new DevBeDev.API.Models.Administrador
            {
                Nome = "Administrador Master",
                Email = "admin@devbedev.com",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                DataCadastro = DateTime.UtcNow,
                AprovadoPeloAdmin = true,
                SolicitouUpgrade = false
            };

            context.Usuarios.Add(admin);
            context.SaveChanges();
        }
        else if (adminExistente is not DevBeDev.API.Models.Administrador)
        {
            context.Database.ExecuteSqlRaw(
                "UPDATE \"Usuarios\" SET \"TipoPerfil\" = 'Administrador', \"AprovadoPeloAdmin\" = TRUE, \"SolicitouUpgrade\" = FALSE WHERE \"Email\" = 'admin@devbedev.com'"
            );
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Falha ao executar migrations ou seed inicial no PostgreSQL durante a inicialização.");
    }
}

app.Run();

namespace DevBeDev.API.Middlewares
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;

        public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro não tratado na requisição {Method} {Path}", context.Request.Method, context.Request.Path);
                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                    await context.Response.WriteAsJsonAsync(new
                    {
                        mensagem = "Ocorreu um erro interno no servidor.",
                        detalhes = ex.Message
                    });
                }
            }
        }
    }
}