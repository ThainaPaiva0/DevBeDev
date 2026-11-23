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

// 1. Configurar MongoDB (DevBeDevNoSQL na porta 27017)
var mongoConnectionString = builder.Configuration["MongoDbSettings:ConnectionString"] ?? "mongodb://localhost:27017";
var mongoClientSettings = MongoClientSettings.FromConnectionString(mongoConnectionString);
mongoClientSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(5);
mongoClientSettings.ConnectTimeout = TimeSpan.FromSeconds(5);
builder.Services.AddSingleton<IMongoClient>(new MongoClient(mongoClientSettings));

// 2. Configurar SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
builder.Services.AddScoped<ComentarioService>();
builder.Services.AddScoped<MensagemService>();
builder.Services.AddScoped<ProjetoService>();
builder.Services.AddScoped<UsuarioService>();

// 7. Configurar Autenticação JWT
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["SecretKey"] ?? "uma-chave-secreta-muito-segura-para-desenvolvimento-123";

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

// Removido app.UseHttpsRedirection() para manter compatibilidade HTTP com Expo Mobile na porta 5091
// ESSENCIAL: Habilitar o uso da pasta wwwroot para os uploads nativos
app.UseStaticFiles();
app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    try
    {
        var context = scope.ServiceProvider.GetRequiredService<DevBeDev.API.Data.ApplicationDbContext>();

        var adminExistente = context.Usuarios.FirstOrDefault(u => u.Email == "admin@devbedev.com");
        if (adminExistente == null)
        {
            var admin = new DevBeDev.API.Models.Administrador
            {
                Nome = "Administrador Master",
                Email = "admin@devbedev.com",
                SenhaHash = BCrypt.Net.BCrypt.HashPassword("admin123"),
                DataCadastro = DateTime.Now,
                AprovadoPeloAdmin = true,
                SolicitouUpgrade = false
            };

            context.Usuarios.Add(admin);
            context.SaveChanges();
        }
        else if (adminExistente is not DevBeDev.API.Models.Administrador)
        {
            context.Database.ExecuteSqlRaw(
                "UPDATE Usuarios SET TipoPerfil = 'Administrador', AprovadoPeloAdmin = 1, SolicitouUpgrade = 0 WHERE Email = 'admin@devbedev.com'"
            );
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Falha ao executar seed inicial no SQL Server durante a inicialização.");
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