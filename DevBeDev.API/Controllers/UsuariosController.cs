using DevBeDev.API.Data;
using DevBeDev.API.DTOs;
using DevBeDev.API.Models;
using DevBeDev.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace DevBeDev.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly UsuarioService _usuarioService;
        private readonly CloudinaryService _cloudinaryService;
        private readonly IConfiguration _configuration;

        public UsuariosController(
            ApplicationDbContext context,
            UsuarioService usuarioService,
            CloudinaryService cloudinaryService,
            IConfiguration configuration)
        {
            _context = context;
            _usuarioService = usuarioService;
            _cloudinaryService = cloudinaryService;
            _configuration = configuration;
        }

        // POST: api/usuarios/registrar
        [HttpPost("registrar")]
        public async Task<IActionResult> Registrar([FromBody] UsuarioCreateDTO dto)
        {
            if (await _context.Usuarios.AnyAsync(u => u.Email == dto.Email))
                return BadRequest(new { mensagem = "E-mail já cadastrado." });

            var espectador = new Espectador
            {
                Nome = dto.Nome,
                Email = dto.Email,
                SenhaHash = BCrypt.Net.BCrypt.HashPassword(dto.Senha),
                DataCadastro = DateTime.UtcNow,
                AprovadoPeloAdmin = true,
                SolicitouUpgrade = false,
                UpgradeRecusado = false,
                MotivoRecusa = null
            };

            _context.Usuarios.Add(espectador);
            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Usuário cadastrado com sucesso como Espectador!" });
        }

        // POST: api/usuarios/solicitar-upgrade
        [Authorize]
        [HttpPost("solicitar-upgrade")]
        public async Task<IActionResult> SolicitarUpgrade([FromBody] SolicitarUpgradeDTO dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(userIdClaim, out int userId)) return Unauthorized();

            var usuario = await _context.Usuarios.FindAsync(userId);
            if (usuario == null) return NotFound(new { mensagem = "Usuário não encontrado." });

            if (dto.TipoDesejado != "Dev" && dto.TipoDesejado != "Recrutador")
                return BadRequest(new { mensagem = "Tipo de upgrade inválido. Escolha 'Dev' ou 'Recrutador'." });

            usuario.SolicitouUpgrade = true;
            usuario.UpgradeRecusado = false;
            usuario.MotivoRecusa = null;
            usuario.TipoSolicitado = dto.TipoDesejado;
            usuario.Bio = dto.Bio ?? usuario.Bio;
            usuario.LinkGitHub = dto.LinkGitHub ?? usuario.LinkGitHub;
            usuario.CnpjEmpresa = dto.CnpjEmpresa ?? usuario.CnpjEmpresa;
            usuario.LinkLinkedIn = dto.LinkLinkedIn ?? usuario.LinkLinkedIn;

            await _context.SaveChangesAsync();
            return Ok(new { mensagem = "Solicitação de upgrade registrada com sucesso! Aguardando aprovação do Administrador." });
        }

        // GET: api/usuarios/pendentes-upgrade
        [Authorize(Roles = "Administrador")]
        [HttpGet("pendentes-upgrade")]
        public async Task<IActionResult> GetUsuariosPendentesUpgrade()
        {
            var pendentes = await _context.Usuarios
                .Where(u => u.SolicitouUpgrade == true)
                .Select(u => new
                {
                    u.Id,
                    u.Nome,
                    u.Email,
                    TipoDesejado = u.TipoSolicitado ?? "Dev",
                    TipoSolicitado = u.TipoSolicitado ?? "Dev",
                    u.Bio,
                    u.LinkGitHub,
                    u.CnpjEmpresa,
                    u.LinkLinkedIn,
                    u.DataCadastro
                })
                .ToListAsync();

            return Ok(pendentes);
        }

        // POST: api/usuarios/{id}/aprovar-upgrade
        [Authorize(Roles = "Administrador")]
        [HttpPost("{id}/aprovar-upgrade")]
        public async Task<IActionResult> AprovarUpgrade(int id, [FromBody] AprovarUpgradeDTO? dto)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(new { mensagem = "Usuário não encontrado." });

            if (!usuario.SolicitouUpgrade)
                return BadRequest(new { mensagem = "Este usuário não possui solicitação de upgrade pendente." });

            string novoTipo = !string.IsNullOrWhiteSpace(dto?.NovoTipo) ? dto.NovoTipo : (usuario.TipoSolicitado ?? "Dev");

            if (novoTipo != "Dev" && novoTipo != "Recrutador")
                return BadRequest(new { mensagem = "Tipo de perfil inválido." });

            string? bioFinal = usuario.Bio ?? string.Empty;
            string? linkGitHubFinal = usuario.LinkGitHub ?? string.Empty;
            string? cnpjEmpresaFinal = usuario.CnpjEmpresa ?? string.Empty;
            string? linkLinkedInFinal = usuario.LinkLinkedIn ?? string.Empty;

            await _context.Database.ExecuteSqlRawAsync(
                "UPDATE \"Usuarios\" SET \"TipoPerfil\" = {0}, \"SolicitouUpgrade\" = FALSE, \"UpgradeRecusado\" = FALSE, \"MotivoRecusa\" = NULL, \"AprovadoPeloAdmin\" = TRUE, \"Bio\" = {1}, \"LinkGitHub\" = {2}, \"CnpjEmpresa\" = {3}, \"LinkLinkedIn\" = {4} WHERE \"Id\" = {5}",
                novoTipo,
                bioFinal,
                linkGitHubFinal,
                cnpjEmpresaFinal,
                linkLinkedInFinal,
                usuario.Id
            );

            _context.ChangeTracker.Clear();

            return Ok(new { mensagem = $"Upgrade do usuário alterado para {novoTipo} com sucesso!" });
        }

        // POST: api/usuarios/{id}/rejeitar-upgrade
        [Authorize(Roles = "Administrador")]
        [HttpPost("{id}/rejeitar-upgrade")]
        public async Task<IActionResult> RejeitarUpgrade(int id, [FromBody] RejeitarSolicitacaoDTO? dto)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(new { mensagem = "Usuário não encontrado." });

            if (!usuario.SolicitouUpgrade)
                return BadRequest(new { mensagem = "Este usuário não possui solicitação de upgrade pendente." });

            var motivo = dto?.Motivo?.Trim();
            if (string.IsNullOrWhiteSpace(motivo))
                return BadRequest(new { mensagem = "O motivo da recusa é obrigatório." });

            usuario.SolicitouUpgrade = false;
            usuario.UpgradeRecusado = true;
            usuario.MotivoRecusa = motivo;

            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Solicitação de upgrade recusada com sucesso.", motivoRecusa = usuario.MotivoRecusa });
        }

        // GET: api/usuarios/todos
        [Authorize(Roles = "Administrador")]
        [HttpGet("todos")]
        public async Task<IActionResult> ListarTodosUsuarios()
        {
            var usuarios = await _context.Usuarios
                .Select(u => new
                {
                    u.Id,
                    u.Nome,
                    u.Email,
                    TipoPerfil = u is Dev ? "Dev" : (u is Recrutador ? "Recrutador" : (u is Administrador ? "Administrador" : "Espectador")),
                    u.DataCadastro,
                    u.AprovadoPeloAdmin,
                    u.SolicitouUpgrade,
                    u.UpgradeRecusado,
                    u.MotivoRecusa,
                    u.Bio,
                    u.LinkGitHub,
                    u.CnpjEmpresa,
                    u.LinkLinkedIn
                })
                .ToListAsync();

            return Ok(usuarios);
        }

        // GET: api/usuarios/{id}/perfil-publico
        [HttpGet("{id}/perfil-publico")]
        public async Task<IActionResult> ObterPerfilPublico(int id)
        {
            var dev = await _context.Devs.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id);
            if (dev == null) return NotFound(new { mensagem = "Desenvolvedor não encontrado." });

            var bio = !string.IsNullOrEmpty(dev.Bio) ? dev.Bio : ((Usuario)dev).Bio;
            var linkGitHub = !string.IsNullOrEmpty(dev.LinkGitHub) ? dev.LinkGitHub : ((Usuario)dev).LinkGitHub;

            var projetosDb = await _context.Projetos
                .AsNoTracking()
                .Include(p => p.Upvotes)
                .Where(p => p.DevId == id && p.AprovadoPeloAdmin == true)
                .OrderByDescending(p => p.DataPublicacao)
                .ToListAsync();

            var projetos = projetosDb.AsEnumerable().Select(p => new
            {
                p.Id,
                p.Titulo,
                p.Descricao,
                p.LinkRepositorio,
                p.FotoUrl,
                Fotos = p.Fotos,
                p.VideoUrl,
                p.DataPublicacao,
                p.Tecnologias,
                TotalVotos = p.Upvotes.Count
            }).ToList();

            return Ok(new
            {
                dev.Id,
                dev.Nome,
                TipoPerfil = "Dev",
                Bio = bio,
                LinkGitHub = linkGitHub,
                dev.FotoPerfilUrl,
                Projetos = projetos
            });
        }

        // POST: api/usuarios/foto-perfil
        [Authorize]
        [HttpPost("foto-perfil")]
        public async Task<IActionResult> UploadFotoPerfil([FromForm] IFormFile foto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out int userId))
                return Unauthorized();

            if (foto == null || foto.Length == 0)
                return BadRequest(new { mensagem = "Nenhuma foto foi enviada." });

            if (string.IsNullOrEmpty(foto.ContentType) || !foto.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { mensagem = "O arquivo enviado deve ser uma imagem." });

            var usuario = await _context.Usuarios.FindAsync(userId);
            if (usuario == null) return NotFound(new { mensagem = "Usuário não encontrado." });

            var urlFoto = await _cloudinaryService.UploadImagemAsync(foto, "devbedev/perfis");
            if (string.IsNullOrWhiteSpace(urlFoto))
                return StatusCode(StatusCodes.Status500InternalServerError, new { mensagem = "Não foi possível obter a URL da imagem enviada ao Cloudinary." });

            usuario.FotoPerfilUrl = urlFoto;
            await _context.SaveChangesAsync();

            return Ok(new { fotoPerfilUrl = usuario.FotoPerfilUrl });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDTO dto)
        {
            var token = await _usuarioService.LoginAsync(dto);

            if (token == null)
                return Unauthorized(new { mensagem = "E-mail ou senha incorretos." });

            return Ok(new { token });
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> ObterMeuPerfil()
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out int userId))
                return Unauthorized();

            var usuario = await _context.Usuarios.FindAsync(userId);
            if (usuario == null) return NotFound();

            var meusProjetosDb = await _context.Projetos
                .AsNoTracking()
                .Include(p => p.Upvotes)
                .Where(p => p.DevId == userId)
                .OrderByDescending(p => p.DataPublicacao)
                .ToListAsync();

            var meusProjetos = meusProjetosDb.AsEnumerable().Select(p => new
            {
                p.Id,
                p.Titulo,
                p.Descricao,
                p.LinkRepositorio,
                p.FotoUrl,
                Fotos = p.Fotos,
                p.VideoUrl,
                p.AprovadoPeloAdmin,
                p.RecusadoPeloAdmin,
                p.MotivoRecusa,
                p.DataPublicacao,
                p.Tecnologias,
                TotalVotos = p.Upvotes.Count
            }).ToList();

            var usuarioDto = UsuarioService.ParaResponseDTO(usuario);
            var novoToken = GerarJwtToken(usuario);

            return Ok(new
            {
                Usuario = usuarioDto,
                usuarioDto.Id,
                usuarioDto.Nome,
                usuarioDto.Email,
                usuarioDto.TipoPerfil,
                usuarioDto.DataCadastro,
                usuarioDto.FotoPerfilUrl,
                SolicitouUpgrade = usuario.SolicitouUpgrade,
                UpgradeRecusado = usuario.UpgradeRecusado,
                TipoSolicitado = usuario.TipoSolicitado,
                MotivoRecusa = usuario.MotivoRecusa,
                Bio = usuario.Bio,
                LinkGitHub = usuario.LinkGitHub,
                CnpjEmpresa = usuario.CnpjEmpresa,
                LinkLinkedIn = usuario.LinkLinkedIn,
                Projetos = meusProjetos,
                NovoToken = novoToken
            });
        }

        [Authorize]
        [HttpPut("me")]
        public async Task<IActionResult> AtualizarMeuPerfil([FromBody] UsuarioUpdateDTO dto)
        {
            if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out int userId))
                return Unauthorized();

            var usuario = await _context.Usuarios.FindAsync(userId);
            if (usuario == null) return NotFound(new { mensagem = "Usuário não encontrado." });

            usuario.Nome = dto.Nome ?? usuario.Nome;

            if (usuario is Dev dev)
            {
                dev.Bio = dto.Bio ?? dev.Bio;
                dev.LinkGitHub = dto.LinkGitHub ?? dev.LinkGitHub;
            }
            else if (usuario is Recrutador recrutador)
            {
                recrutador.CnpjEmpresa = dto.CnpjEmpresa ?? recrutador.CnpjEmpresa;
                recrutador.LinkLinkedIn = dto.LinkLinkedIn ?? recrutador.LinkLinkedIn;
            }
            _context.Usuarios.Update(usuario);
            await _context.SaveChangesAsync();
            return Ok(new { mensagem = "Perfil atualizado com sucesso!", usuario = UsuarioService.ParaResponseDTO(usuario) });
        }

        private string GerarJwtToken(Usuario usuario)
        {
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = _configuration["Jwt:Key"]
                ?? Environment.GetEnvironmentVariable("Jwt__Key")
                ?? _configuration["JwtSettings:SecretKey"]
                ?? "SubstituaPorUmaChaveSecretaLongaESeguraAqui123!";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

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
                expires: DateTime.UtcNow.AddHours(8),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public class SolicitarUpgradeDTO
    {
        public string TipoDesejado { get; set; } = "Dev";
        public string? Bio { get; set; }
        public string? LinkGitHub { get; set; }
        public string? CnpjEmpresa { get; set; }
        public string? LinkLinkedIn { get; set; }
    }

    public class AprovarUpgradeDTO
    {
        public string? NovoTipo { get; set; }
    }

    public class RejeitarSolicitacaoDTO
    {
        public string? Motivo { get; set; }
    }
}