using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using DevBeDev.API.Data;
using DevBeDev.API.Models;
using DevBeDev.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevBeDev.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MensagensController : ControllerBase
    {
        private static readonly HashSet<string> PerfisPermitidos = new(StringComparer.OrdinalIgnoreCase)
        {
            "Recrutador",
            "Dev",
            "Administrador"
        };

        private readonly MensagemService _mensagemService;
        private readonly ApplicationDbContext _context;

        public MensagensController(MensagemService mensagemService, ApplicationDbContext context)
        {
            _mensagemService = mensagemService;
            _context = context;
        }

        private static string ObterTipoPerfil(Usuario usuario)
        {
            return usuario switch
            {
                Dev => "Dev",
                Recrutador => "Recrutador",
                Administrador => "Administrador",
                _ => "Espectador"
            };
        }

        private int? ObterUsuarioAutenticadoId()
        {
            var claimValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("nameid")?.Value
                ?? User.FindFirst("sub")?.Value;

            if (int.TryParse(claimValue, out int userId) && userId > 0)
                return userId;

            return null;
        }

        // POST: api/mensagens
        [HttpPost]
        public async Task<IActionResult> EnviarMensagem([FromBody] EnviarMensagemDTO dto)
        {
            var remetenteId = ObterUsuarioAutenticadoId();
            if (!remetenteId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            if (dto == null || string.IsNullOrWhiteSpace(dto.Conteudo))
                return BadRequest(new { mensagem = "O conteúdo da mensagem não pode ser vazio." });

            var conteudoLimpo = dto.Conteudo.Trim();
            if (conteudoLimpo.Length > 2000)
                return BadRequest(new { mensagem = "A mensagem deve ter no máximo 2000 caracteres." });

            if (dto.DestinatarioId <= 0 || dto.DestinatarioId == remetenteId.Value)
                return BadRequest(new { mensagem = "Destinatário inválido." });

            var remetente = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == remetenteId.Value);
            if (remetente == null)
                return Unauthorized(new { mensagem = "Usuário remetente não encontrado." });

            var perfilRemetente = ObterTipoPerfil(remetente);
            if (!PerfisPermitidos.Contains(perfilRemetente))
                return StatusCode(StatusCodes.Status403Forbidden, new { mensagem = "Perfil Espectador não tem permissão para enviar mensagens diretas." });

            var destinatario = await _context.Usuarios.AsNoTracking().FirstOrDefaultAsync(u => u.Id == dto.DestinatarioId);
            if (destinatario == null)
                return NotFound(new { mensagem = "Usuário destinatário não encontrado." });

            var perfilDestinatario = ObterTipoPerfil(destinatario);
            if (!PerfisPermitidos.Contains(perfilDestinatario))
                return StatusCode(StatusCodes.Status403Forbidden, new { mensagem = "Apenas usuários com perfil Dev, Recrutador ou Administrador podem receber mensagens diretas." });

            var novaMensagem = new MensagemDireta
            {
                RemetenteId = remetente.Id,
                RemetenteNome = remetente.Nome,
                RemetentePerfil = perfilRemetente,
                DestinatarioId = destinatario.Id,
                DestinatarioNome = destinatario.Nome,
                DestinatarioPerfil = perfilDestinatario,
                Conteudo = conteudoLimpo,
                DataEnvio = DateTime.Now
            };

            var salva = await _mensagemService.EnviarAsync(novaMensagem);
            if (salva == null)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { mensagem = "Serviço de mensagens (MongoDB) temporariamente indisponível. Verifique se o MongoDB está rodando." });

            return CreatedAtAction(nameof(ObterHistorico), new { outroUsuarioId = destinatario.Id }, new
            {
                id = salva.Id,
                remetenteId = salva.RemetenteId,
                remetenteNome = salva.RemetenteNome,
                remetentePerfil = salva.RemetentePerfil,
                destinatarioId = salva.DestinatarioId,
                destinatarioNome = salva.DestinatarioNome,
                destinatarioPerfil = salva.DestinatarioPerfil,
                conteudo = salva.Conteudo,
                dataEnvio = salva.DataEnvio
            });

        }

        // GET: api/mensagens/conversas
        [HttpGet("conversas")]
        public async Task<IActionResult> ListarConversas()
        {
            var usuarioId = ObterUsuarioAutenticadoId();
            if (!usuarioId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            var mensagens = await _mensagemService.ObterMensagensDoUsuarioAsync(usuarioId.Value);

            var conversas = mensagens
                .GroupBy(m => m.RemetenteId == usuarioId.Value ? m.DestinatarioId : m.RemetenteId)
                .Select(grupo =>
                {
                    var ultima = grupo.OrderByDescending(m => m.DataEnvio).First();
                    bool euEnviei = ultima.RemetenteId == usuarioId.Value;
                    int contatoId = euEnviei ? ultima.DestinatarioId : ultima.RemetenteId;
                    string contatoNome = euEnviei ? ultima.DestinatarioNome : ultima.RemetenteNome;
                    string contatoPerfil = euEnviei ? ultima.DestinatarioPerfil : ultima.RemetentePerfil;

                    return new
                    {
                        usuarioId = contatoId,
                        id = contatoId,
                        nome = contatoNome,
                        tipoPerfil = contatoPerfil,
                        ultimaMensagem = ultima.Conteudo,
                        dataUltimaMensagem = ultima.DataEnvio,
                        enviadaPorMim = euEnviei
                    };
                })
                .OrderByDescending(c => c.dataUltimaMensagem)
                .ToList();

            var idsContatos = conversas.Select(c => c.usuarioId).Distinct().ToList();
            var fotosPorId = await _context.Usuarios
                .AsNoTracking()
                .Where(u => idsContatos.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FotoPerfilUrl);

            var resultado = conversas.Select(c => new
            {
                c.usuarioId,
                c.id,
                c.nome,
                c.tipoPerfil,
                fotoPerfilUrl = fotosPorId.TryGetValue(c.usuarioId, out var foto) ? foto : null,
                c.ultimaMensagem,
                c.dataUltimaMensagem,
                c.enviadaPorMim
            }).ToList();

            return Ok(resultado);
        }

        // GET: api/mensagens/contatos
        [HttpGet("contatos")]
        public async Task<IActionResult> ListarContatosElegiveis()
        {
            var usuarioId = ObterUsuarioAutenticadoId();
            if (!usuarioId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            var usuariosDb = await _context.Usuarios
                .AsNoTracking()
                .Where(u => u.Id != usuarioId.Value)
                .ToListAsync();

            var contatos = usuariosDb
                .Select(u => new
                {
                    id = u.Id,
                    usuarioId = u.Id,
                    nome = u.Nome,
                    email = u.Email,
                    tipoPerfil = ObterTipoPerfil(u),
                    fotoPerfilUrl = u.FotoPerfilUrl,
                    bio = u.Bio,
                    cnpjEmpresa = u.CnpjEmpresa
                })
                .Where(u => PerfisPermitidos.Contains(u.tipoPerfil))
                .OrderBy(u => u.nome)
                .ToList();

            return Ok(contatos);
        }

        // GET: api/mensagens/{outroUsuarioId}
        [HttpGet("{outroUsuarioId:int}")]
        public async Task<IActionResult> ObterHistorico(int outroUsuarioId)
        {
            var usuarioId = ObterUsuarioAutenticadoId();
            if (!usuarioId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            if (outroUsuarioId <= 0 || outroUsuarioId == usuarioId.Value)
                return BadRequest(new { mensagem = "Identificador de usuário inválido." });

            var outroUsuarioExiste = await _context.Usuarios.AsNoTracking().AnyAsync(u => u.Id == outroUsuarioId);
            if (!outroUsuarioExiste)
                return NotFound(new { mensagem = "Usuário não encontrado." });

            var historico = await _mensagemService.ObterHistoricoAsync(usuarioId.Value, outroUsuarioId);
            var payload = historico.Select(m => new
            {
                id = m.Id,
                remetenteId = m.RemetenteId,
                remetenteNome = m.RemetenteNome,
                remetentePerfil = m.RemetentePerfil,
                destinatarioId = m.DestinatarioId,
                destinatarioNome = m.DestinatarioNome,
                destinatarioPerfil = m.DestinatarioPerfil,
                conteudo = m.Conteudo,
                dataEnvio = m.DataEnvio
            }).ToList();

            return Ok(payload);
        }
    }

    public class EnviarMensagemDTO
    {
        [Required(ErrorMessage = "O destinatário é obrigatório.")]
        public int DestinatarioId { get; set; }

        [Required(ErrorMessage = "O conteúdo da mensagem é obrigatório.")]
        [StringLength(2000, MinimumLength = 1, ErrorMessage = "A mensagem deve ter entre 1 e 2000 caracteres.")]
        public string Conteudo { get; set; } = string.Empty;
    }
}