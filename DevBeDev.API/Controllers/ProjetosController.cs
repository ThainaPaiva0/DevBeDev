using System.Security.Claims;
using System.Text.Json;
using DevBeDev.API.Data;
using DevBeDev.API.DTOs;
using DevBeDev.API.Models;
using DevBeDev.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DevBeDev.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjetosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ProjetoService _projetoService;
        private readonly CloudinaryService _cloudinaryService;

        public ProjetosController(
            ApplicationDbContext context,
            ProjetoService projetoService,
            CloudinaryService cloudinaryService)
        {
            _context = context;
            _projetoService = projetoService;
            _cloudinaryService = cloudinaryService;
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

        private static string ResolverStatusProjeto(Projeto projeto)
        {
            if (projeto.RecusadoPeloAdmin)
                return "Recusado";

            if (projeto.AprovadoPeloAdmin)
                return "Aprovado";

            return "Pendente";
        }

        // GET: api/projetos/feed?busca=...&page=1&limit=10
        [HttpGet("feed")]
        public async Task<IActionResult> ObterFeed(
            [FromQuery] string? busca = null,
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10)
        {
            if (page < 1) page = 1;
            if (limit < 1) limit = 10;
            if (limit > 50) limit = 50;

            var query = _context.Projetos
                .AsNoTracking()
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .Where(p => p.AprovadoPeloAdmin == true && p.RecusadoPeloAdmin == false);

            var projetosDb = await query
                .OrderByDescending(p => p.DataPublicacao)
                .ToListAsync();

            var projetosAvaliados = projetosDb.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(busca))
            {
                var termo = busca.Trim().ToLowerInvariant();
                projetosAvaliados = projetosAvaliados.Where(p =>
                    (!string.IsNullOrWhiteSpace(p.Titulo) && p.Titulo.ToLowerInvariant().Contains(termo)) ||
                    (!string.IsNullOrWhiteSpace(p.Descricao) && p.Descricao.ToLowerInvariant().Contains(termo)) ||
                    (p.Autor != null && !string.IsNullOrWhiteSpace(p.Autor.Nome) && p.Autor.Nome.ToLowerInvariant().Contains(termo)) ||
                    (p.Tecnologias != null && p.Tecnologias.Any(t => !string.IsNullOrWhiteSpace(t) && t.ToLowerInvariant().Contains(termo)))
                );
            }

            var listaFiltrada = projetosAvaliados.ToList();
            var totalItens = listaFiltrada.Count;

            var itensPaginados = listaFiltrada
                .Skip((page - 1) * limit)
                .Take(limit)
                .Select(p => new
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
                    p.DevId,
                    Autor = p.Autor != null ? p.Autor.Nome : "Anônimo",
                    AutorFotoPerfilUrl = p.Autor != null ? p.Autor.FotoPerfilUrl : null,
                    TotalVotos = p.Upvotes.Count
                })
                .ToList();

            return Ok(new
            {
                page,
                limit,
                total = totalItens,
                projetos = itensPaginados
            });
        }

        // GET: api/projetos/{id:int}
        [HttpGet("{id:int}")]
        public async Task<IActionResult> ObterPorId(int id)
        {
            if (id <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            var projetoDb = await _context.Projetos
                .AsNoTracking()
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (projetoDb == null)
                return NotFound(new { mensagem = "Projeto não encontrado." });

            var p = new[] { projetoDb }.AsEnumerable().Select(item => new
            {
                item.Id,
                item.Titulo,
                item.Descricao,
                item.LinkRepositorio,
                item.FotoUrl,
                Fotos = item.Fotos,
                item.VideoUrl,
                item.AprovadoPeloAdmin,
                item.RecusadoPeloAdmin,
                item.MotivoRecusa,
                Status = ResolverStatusProjeto(item),
                item.DataPublicacao,
                item.Tecnologias,
                item.DevId,
                Autor = item.Autor != null ? item.Autor.Nome : "Anônimo",
                AutorFotoPerfilUrl = item.Autor != null ? item.Autor.FotoPerfilUrl : null,
                TotalVotos = item.Upvotes.Count
            }).First();

            return Ok(p);
        }

        // GET: api/projetos/dev/{devId:int}
        [HttpGet("dev/{devId:int}")]
        public async Task<IActionResult> ObterPorDev(int devId)
        {
            if (devId <= 0)
                return BadRequest(new { mensagem = "Identificador de desenvolvedor inválido." });

            var projetosDb = await _context.Projetos
                .AsNoTracking()
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .Where(p => p.DevId == devId && p.AprovadoPeloAdmin == true && p.RecusadoPeloAdmin == false)
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
                p.DevId,
                Autor = p.Autor != null ? p.Autor.Nome : "Anônimo",
                AutorFotoPerfilUrl = p.Autor != null ? p.Autor.FotoPerfilUrl : null,
                TotalVotos = p.Upvotes.Count
            }).ToList();

            return Ok(projetos);
        }

        // GET: api/projetos/meus-projetos
        [Authorize(Roles = "Dev")]
        [HttpGet("meus-projetos")]
        public async Task<IActionResult> ObterMeusProjetos()
        {
            var devId = ObterUsuarioAutenticadoId();
            if (!devId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            var projetosDb = await _context.Projetos
                .AsNoTracking()
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .Where(p => p.DevId == devId.Value)
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
                p.AprovadoPeloAdmin,
                p.RecusadoPeloAdmin,
                p.MotivoRecusa,
                Status = ResolverStatusProjeto(p),
                p.DataPublicacao,
                p.Tecnologias,
                p.DevId,
                Autor = p.Autor != null ? p.Autor.Nome : "Anônimo",
                AutorFotoPerfilUrl = p.Autor != null ? p.Autor.FotoPerfilUrl : null,
                TotalVotos = p.Upvotes.Count
            }).ToList();

            return Ok(projetos);
        }

        // POST: api/projetos/upload-projeto
        [Authorize(Roles = "Dev")]
        [HttpPost("upload-projeto")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadProjeto([FromForm] ProjetoUploadDTO dto)
        {
            var devId = ObterUsuarioAutenticadoId();
            if (!devId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            if (dto == null)
                return BadRequest(new { mensagem = "Dados do projeto inválidos." });

            var tituloLimpo = dto.Titulo?.Trim() ?? string.Empty;
            var descricaoLimpa = dto.Descricao?.Trim() ?? string.Empty;
            var linkLimpo = dto.LinkRepositorio?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(tituloLimpo) ||
                string.IsNullOrWhiteSpace(descricaoLimpa) ||
                string.IsNullOrWhiteSpace(linkLimpo))
            {
                return BadRequest(new { mensagem = "Título, descrição e link do repositório são obrigatórios." });
            }

            if (dto.Fotos != null && dto.Fotos.Count > 5)
                return BadRequest(new { mensagem = "Você pode enviar no máximo 5 fotos por projeto." });

            var urlsFotos = new List<string>();
            if (dto.Fotos != null && dto.Fotos.Count > 0)
            {
                foreach (var foto in dto.Fotos.Take(5))
                {
                    if (foto == null || foto.Length == 0)
                        continue;

                    if (string.IsNullOrWhiteSpace(foto.ContentType) ||
                        !foto.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                    {
                        return BadRequest(new { mensagem = $"O arquivo '{foto.FileName}' deve ser uma imagem válida." });
                    }

                    var urlFoto = await _cloudinaryService.UploadImagemAsync(foto, "devbedev/projetos/imagens");
                    if (!string.IsNullOrWhiteSpace(urlFoto))
                        urlsFotos.Add(urlFoto);
                }
            }

            string? urlVideo = null;
            if (dto.Video != null && dto.Video.Length > 0)
            {
                if (string.IsNullOrWhiteSpace(dto.Video.ContentType) ||
                    !dto.Video.ContentType.StartsWith("video/", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { mensagem = $"O arquivo '{dto.Video.FileName}' deve ser um vídeo válido." });
                }

                urlVideo = await _cloudinaryService.UploadVideoAsync(dto.Video, "devbedev/projetos/videos");
            }

            var novoProjeto = new Projeto
            {
                Titulo = tituloLimpo,
                Descricao = descricaoLimpa,
                LinkRepositorio = linkLimpo,
                FotoUrl = urlsFotos.FirstOrDefault(),
                FotosJson = urlsFotos.Count > 0 ? JsonSerializer.Serialize(urlsFotos) : null,
                VideoUrl = urlVideo,
                AprovadoPeloAdmin = false,
                RecusadoPeloAdmin = false,
                MotivoRecusa = null,
                DataPublicacao = DateTime.Now,
                DevId = devId.Value,
                Tecnologias = new List<string>()
            };

            await _projetoService.CriarAsync(novoProjeto);

            return StatusCode(StatusCodes.Status201Created, new
            {
                mensagem = "Projeto enviado com sucesso e aguardando aprovação do Administrador.",
                id = novoProjeto.Id,
                titulo = novoProjeto.Titulo,
                descricao = novoProjeto.Descricao,
                linkRepositorio = novoProjeto.LinkRepositorio,
                fotoUrl = novoProjeto.FotoUrl,
                fotos = urlsFotos,
                videoUrl = novoProjeto.VideoUrl,
                aprovadoPeloAdmin = novoProjeto.AprovadoPeloAdmin,
                recusadoPeloAdmin = novoProjeto.RecusadoPeloAdmin,
                status = ResolverStatusProjeto(novoProjeto),
                dataPublicacao = novoProjeto.DataPublicacao
            });
        }

        // POST: api/projetos/{id:int}/upvote
        [Authorize]
        [HttpPost("{id:int}/upvote")]
        public async Task<IActionResult> AlternarUpvote(int id)
        {
            if (id <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            var userId = ObterUsuarioAutenticadoId();
            if (!userId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            var projetoExiste = await _context.Projetos.AnyAsync(p => p.Id == id);
            if (!projetoExiste)
                return NotFound(new { mensagem = "Projeto não encontrado." });

            var upvoteExistente = await _context.Upvotes
                .FirstOrDefaultAsync(u => u.ProjetoId == id && u.UsuarioId == userId.Value);

            bool votado;
            if (upvoteExistente != null)
            {
                _context.Upvotes.Remove(upvoteExistente);
                votado = false;
            }
            else
            {
                var novoUpvote = new Upvote
                {
                    ProjetoId = id,
                    UsuarioId = userId.Value,
                    DataUpvote = DateTime.Now
                };
                _context.Upvotes.Add(novoUpvote);
                votado = true;
            }

            await _context.SaveChangesAsync();

            var totalVotos = await _context.Upvotes.CountAsync(u => u.ProjetoId == id);

            return Ok(new
            {
                projetoId = id,
                votado,
                totalVotos
            });
        }

        // PUT: api/projetos/{id:int}
        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> AtualizarProjeto(int id, [FromBody] ProjetoUpdateDto dto)
        {
            if (id <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            var userId = ObterUsuarioAutenticadoId();
            if (!userId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            if (dto == null)
                return BadRequest(new { mensagem = "Dados de atualização inválidos." });

            var projeto = await _context.Projetos.FirstOrDefaultAsync(p => p.Id == id);
            if (projeto == null)
                return NotFound(new { mensagem = "Projeto não encontrado." });

            if (projeto.DevId != userId.Value)
                return Forbid();

            if (!string.IsNullOrWhiteSpace(dto.Titulo))
                projeto.Titulo = dto.Titulo.Trim();

            if (!string.IsNullOrWhiteSpace(dto.Descricao))
                projeto.Descricao = dto.Descricao.Trim();

            if (!string.IsNullOrWhiteSpace(dto.LinkRepositorio))
                projeto.LinkRepositorio = dto.LinkRepositorio.Trim();

            if (dto.FotoUrl != null)
            {
                projeto.FotoUrl = string.IsNullOrWhiteSpace(dto.FotoUrl) ? null : dto.FotoUrl.Trim();
                if (!string.IsNullOrWhiteSpace(projeto.FotoUrl) && string.IsNullOrWhiteSpace(projeto.FotosJson))
                {
                    projeto.FotosJson = JsonSerializer.Serialize(new List<string> { projeto.FotoUrl });
                }
            }

            if (dto.VideoUrl != null)
                projeto.VideoUrl = string.IsNullOrWhiteSpace(dto.VideoUrl) ? null : dto.VideoUrl.Trim();

            await _projetoService.AtualizarAsync(projeto);

            var totalVotos = await _context.Upvotes.CountAsync(u => u.ProjetoId == projeto.Id);

            return Ok(new
            {
                mensagem = "Projeto atualizado com sucesso!",
                id = projeto.Id,
                titulo = projeto.Titulo,
                descricao = projeto.Descricao,
                linkRepositorio = projeto.LinkRepositorio,
                fotoUrl = projeto.FotoUrl,
                fotos = projeto.Fotos,
                videoUrl = projeto.VideoUrl,
                aprovadoPeloAdmin = projeto.AprovadoPeloAdmin,
                recusadoPeloAdmin = projeto.RecusadoPeloAdmin,
                motivoRecusa = projeto.MotivoRecusa,
                status = ResolverStatusProjeto(projeto),
                totalVotos
            });
        }

        // DELETE: api/projetos/{id:int}
        [Authorize]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> ExcluirProjeto(int id)
        {
            if (id <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            var userId = ObterUsuarioAutenticadoId();
            if (!userId.HasValue)
                return Unauthorized(new { mensagem = "Token inválido ou expirado." });

            var projeto = await _context.Projetos.FirstOrDefaultAsync(p => p.Id == id);
            if (projeto == null)
                return NotFound(new { mensagem = "Projeto não encontrado." });

            bool ehAutor = projeto.DevId == userId.Value;
            bool ehAdministrador = User.IsInRole("Administrador");

            if (!ehAutor && !ehAdministrador)
                return Forbid();

            var upvotesRelacionados = await _context.Upvotes
                .Where(u => u.ProjetoId == id)
                .ToListAsync();
            if (upvotesRelacionados.Count > 0)
                _context.Upvotes.RemoveRange(upvotesRelacionados);

            var favoritosRelacionados = await _context.Favoritos
                .Where(f => f.ProjetoId == id)
                .ToListAsync();
            if (favoritosRelacionados.Count > 0)
                _context.Favoritos.RemoveRange(favoritosRelacionados);

            _context.Projetos.Remove(projeto);
            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Projeto excluído com sucesso!" });
        }

        // GET: api/projetos/pendentes-aprovacao
        [Authorize(Roles = "Administrador")]
        [HttpGet("pendentes-aprovacao")]
        public async Task<IActionResult> ListarPendentesAprovacao()
        {
            var pendentesDb = await _context.Projetos
                .AsNoTracking()
                .Include(p => p.Autor)
                .Where(p => p.AprovadoPeloAdmin == false && p.RecusadoPeloAdmin == false)
                .OrderByDescending(p => p.DataPublicacao)
                .ToListAsync();

            var pendentes = pendentesDb.AsEnumerable().Select(p => new
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
                p.DataPublicacao,
                p.Tecnologias,
                p.DevId,
                Autor = p.Autor != null ? p.Autor.Nome : "Anônimo",
                AutorFotoPerfilUrl = p.Autor != null ? p.Autor.FotoPerfilUrl : null
            }).ToList();

            return Ok(pendentes);
        }

        // POST: api/projetos/{id:int}/aprovar-projeto
        [Authorize(Roles = "Administrador")]
        [HttpPost("{id:int}/aprovar-projeto")]
        public async Task<IActionResult> AprovarProjeto(int id)
        {
            if (id <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            var projeto = await _context.Projetos.FirstOrDefaultAsync(p => p.Id == id);
            if (projeto == null)
                return NotFound(new { mensagem = "Projeto não encontrado." });

            projeto.AprovadoPeloAdmin = true;
            projeto.RecusadoPeloAdmin = false;
            projeto.MotivoRecusa = null;

            await _projetoService.AtualizarAsync(projeto);

            return Ok(new
            {
                mensagem = "Projeto aprovado com sucesso!",
                id = projeto.Id,
                aprovadoPeloAdmin = projeto.AprovadoPeloAdmin,
                recusadoPeloAdmin = projeto.RecusadoPeloAdmin,
                motivoRecusa = projeto.MotivoRecusa,
                status = ResolverStatusProjeto(projeto)
            });
        }

        // POST: api/projetos/{id:int}/rejeitar-projeto
        [Authorize(Roles = "Administrador")]
        [HttpPost("{id:int}/rejeitar-projeto")]
        public async Task<IActionResult> RejeitarProjeto(int id, [FromBody] RejeitarProjetoRequestDTO? dto)
        {
            if (id <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            var projeto = await _context.Projetos.FirstOrDefaultAsync(p => p.Id == id);
            if (projeto == null)
                return NotFound(new { mensagem = "Projeto não encontrado." });

            var motivoLimpo = dto?.Motivo?.Trim();
            if (string.IsNullOrWhiteSpace(motivoLimpo))
                return BadRequest(new { mensagem = "O motivo da recusa é obrigatório." });

            projeto.AprovadoPeloAdmin = false;
            projeto.RecusadoPeloAdmin = true;
            projeto.MotivoRecusa = motivoLimpo;

            await _projetoService.AtualizarAsync(projeto);

            return Ok(new
            {
                mensagem = "Projeto rejeitado com sucesso.",
                id = projeto.Id,
                aprovadoPeloAdmin = projeto.AprovadoPeloAdmin,
                recusadoPeloAdmin = projeto.RecusadoPeloAdmin,
                motivoRecusa = projeto.MotivoRecusa,
                status = ResolverStatusProjeto(projeto)
            });
        }

        public class RejeitarProjetoRequestDTO
        {
            public string? Motivo { get; set; }
        }
    }
}

