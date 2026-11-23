using DevBeDev.API.Data;
using DevBeDev.API.DTOs;
using DevBeDev.API.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DevBeDev.API.Services
{
    public class UsuarioService
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public UsuarioService(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<string?> RegistrarAsync(UsuarioCreateDTO dto)
        {
            var emailExiste = await _context.Usuarios.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (emailExiste)
                return "Este e-mail já está cadastrado.";

            string senhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha);

            Usuario usuario = dto.TipoPerfil?.Trim() switch
            {
                "Dev" => new Dev
                {
                    Nome = dto.Nome,
                    Email = dto.Email,
                    SenhaHash = senhaHash,
                    DataCadastro = DateTime.Now,
                    Bio = dto.Bio ?? string.Empty,
                    LinkGitHub = dto.LinkGitHub ?? string.Empty
                },
                "Recrutador" => new Recrutador
                {
                    Nome = dto.Nome,
                    Email = dto.Email,
                    SenhaHash = senhaHash,
                    DataCadastro = DateTime.Now,
                    CnpjEmpresa = dto.CnpjEmpresa ?? string.Empty,
                    LinkLinkedIn = dto.LinkLinkedIn ?? string.Empty
                },
                _ => new Espectador
                {
                    Nome = dto.Nome,
                    Email = dto.Email,
                    SenhaHash = senhaHash,
                    DataCadastro = DateTime.Now
                }
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return null;
        }

        public async Task<string?> LoginAsync(LoginDTO dto)
        {
            var usuario = await _context.Usuarios.FirstOrDefaultAsync(u => u.Email.ToLower() == dto.Email.ToLower());
            if (usuario == null || !BCrypt.Net.BCrypt.Verify(dto.Senha, usuario.SenhaHash))
                return null;

            return GerarJwtToken(usuario);
        }

        public async Task<List<UsuarioResponseDTO>> ListarUsuariosAsync()
        {
            var usuarios = await _context.Usuarios.ToListAsync();
            return usuarios.Select(ParaResponseDTO).ToList();
        }

        public async Task<Usuario?> ObterPorIdAsync(int id)
        {
            return await _context.Usuarios.FindAsync(id);
        }

        public async Task @AtualizarAsync(Usuario usuario)
        {
            _context.Usuarios.Update(usuario);
            await _context.SaveChangesAsync();
        }

        public static UsuarioResponseDTO ParaResponseDTO(Usuario usuario)
        {
            // CORRIGIDO PELO GEMINI: Agora mapeia o Administrador corretamente
            string tipoPerfil = usuario switch
            {
                Dev => "Dev",
                Recrutador => "Recrutador",
                Administrador => "Administrador",
                _ => "Espectador"
            };

            return new UsuarioResponseDTO
            {
                Id = usuario.Id,
                Nome = usuario.Nome,
                Email = usuario.Email,
                TipoPerfil = tipoPerfil,
                DataCadastro = usuario.DataCadastro,
                FotoPerfilUrl = usuario.FotoPerfilUrl
            };
        }

        private string GerarJwtToken(Usuario usuario)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"] ?? "ChavePadraoSeguraEExtremamenteLonga123456!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            // CORRIGIDO PELO GEMINI: Agora emite a role "Administrador" de verdade no token
            string tipoPerfil = usuario switch
            {
                Dev => "Dev",
                Recrutador => "Recrutador",
                Administrador => "Administrador",
                _ => "Espectador"
            };

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                new Claim(ClaimTypes.Name, usuario.Nome),
                new Claim(ClaimTypes.Email, usuario.Email),
                new Claim(ClaimTypes.Role, tipoPerfil)
            };

            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"] ?? "DevBeDev.API",
                audience: jwtSettings["Audience"] ?? "DevBeDev.App",
                claims: claims,
                expires: DateTime.Now.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
