using DevBeDev.API.Data;
using DevBeDev.API.Models;
using DevBeDev.API.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using DevBeDev.API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http.Features;

namespace DevBeDev.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjetosController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ProjetoService _projetoService;
        private readonly IWebHostEnvironment _environment;

        public ProjetosController(ApplicationDbContext context, ProjetoService projetoService, IWebHostEnvironment environment)
        {
            _context = context;
            _projetoService = projetoService;
            _environment = environment;
        }

        // GET: api/projetos/feed (Apenas busca de texto, sem tags)
        [HttpGet("feed")]
        public async Task<IActionResult> GetFeedProjetos(
            [FromQuery] int page = 1,
            [FromQuery] int limit = 10,
            [FromQuery] string? busca = null)
        {
            if (page < 1) page = 1;
            if (limit < 1) limit = 10;
            if (limit > 50) limit = 50;

            var query = _context.Projetos
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .Where(p => p.AprovadoPeloAdmin == true && p.RecusadoPeloAdmin == false);

            if (!string.IsNullOrWhiteSpace(busca))
                query = query.Where(p => p.Titulo.Contains(busca) || p.Descricao.Contains(busca) || (p.Autor != null && p.Autor.Nome.Contains(busca)));

            var totalProjetos = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalProjetos / (double)limit);

            // Ordenação padrão unificada
            var orderedQuery = query.OrderByDescending(p => p.Upvotes.Count).ThenByDescending(p => p.DataPublicacao);

            var projetosDb = await orderedQuery
                .Skip((page - 1) * limit)
                .Take(limit)
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
                p.DataPublicacao,
                p.DevId, // Injetado para o Frontend avaliar exclusão
                Autor = p.Autor != null ? p.Autor.Nome : "Anônimo",
                AutorFotoPerfilUrl = p.Autor != null ? p.Autor.FotoPerfilUrl : null,
                p.Tecnologias,
                TotalVotos = p.Upvotes.Count
            }).ToList();

            return Ok(new
            {
                Total = totalProjetos,
                PaginaAtual = page,
                TotalPaginas = totalPages,
                TamanhoPagina = limit,
                TemProximaPagina = page < totalPages,
                TemPaginaAnterior = page > 1,
                Projetos = projetos
            });
        }

        // GET: api/projetos/meus-projetos
        [Authorize(Roles = "Dev")]
        [HttpGet("meus-projetos")]
        public async Task<IActionResult> GetMeusProjetos()
        {
            var devIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(devIdClaim, out int devId))
                return Unauthorized();

            var projetosDb = await _context.Projetos
                .AsNoTracking()
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .Where(p => p.DevId == devId)
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
                Status = p.RecusadoPeloAdmin
                    ? "Recusado"
                    : (p.AprovadoPeloAdmin ? "Aprovado" : "Pendente"),
                p.MotivoRecusa,
                p.DataPublicacao,
                p.DevId,
                Autor = p.Autor != null ? p.Autor.Nome : "Desenvolvedor",
                AutorFotoPerfilUrl = p.Autor != null ? p.Autor.FotoPerfilUrl : null,
                p.Tecnologias,
                TotalVotos = p.Upvotes.Count,
                TotalUpvotes = p.Upvotes.Count
            }).ToList();

            return Ok(projetos);
        }

        [Authorize(Roles = "Administrador")]
        [HttpGet("pendentes-aprovacao")]
        public async Task<IActionResult> GetProjetosPendentesAprovacao()
        {
            var projetosDb = await _context.Projetos
                .Include(p => p.Autor)
                .Where(p => p.AprovadoPeloAdmin == false && p.RecusadoPeloAdmin == false)
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
                p.RecusadoPeloAdmin,
                p.MotivoRecusa,
                p.DataPublicacao,
                p.DevId,
                Autor = p.Autor != null ? p.Autor.Nome : "Desconhecido"
            }).ToList();

            return Ok(projetos);
        }

        [Authorize(Roles = "Administrador")]
        [HttpPost("{id:int}/aprovar-projeto")]
        public async Task<IActionResult> AprovarProjeto(int id)
        {
            var projeto = await _context.Projetos.FindAsync(id);
            if (projeto == null) return NotFound(new { mensagem = "Projeto não encontrado." });

            projeto.AprovadoPeloAdmin = true;
            projeto.RecusadoPeloAdmin = false;
            projeto.MotivoRecusa = null;
            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Projeto aprovado com sucesso e publicado no feed!" });
        }

        [Authorize(Roles = "Administrador")]
        [HttpPost("{id:int}/rejeitar-projeto")]
        public async Task<IActionResult> RejeitarProjeto(int id, [FromBody] RejeitarProjetoDTO? dto)
        {
            var projeto = await _context.Projetos.FindAsync(id);
            if (projeto == null) return NotFound(new { mensagem = "Projeto não encontrado." });

            var motivo = dto?.Motivo?.Trim();
            if (string.IsNullOrWhiteSpace(motivo))
                return BadRequest(new { mensagem = "O motivo da recusa é obrigatório." });

            projeto.AprovadoPeloAdmin = false;
            projeto.RecusadoPeloAdmin = true;
            projeto.MotivoRecusa = motivo;

            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Projeto recusado com sucesso.", motivoRecusa = projeto.MotivoRecusa });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetProjetoPorId(int id)
        {
            var projetoDb = await _context.Projetos
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (projetoDb == null)
                return NotFound();

            var projeto = new
            {
                projetoDb.Id,
                projetoDb.Titulo,
                projetoDb.Descricao,
                projetoDb.LinkRepositorio,
                projetoDb.FotoUrl,
                Fotos = projetoDb.Fotos,
                projetoDb.VideoUrl,
                projetoDb.AprovadoPeloAdmin,
                projetoDb.RecusadoPeloAdmin,
                projetoDb.MotivoRecusa,
                projetoDb.DataPublicacao,
                projetoDb.DevId,
                AutorNome = projetoDb.Autor != null ? projetoDb.Autor.Nome : "Anônimo",
                TotalUpvotes = projetoDb.Upvotes.Count
            };

            return Ok(projeto);
        }

        // Endpoint Original preservado caso necessário por clientes antigos
        [Authorize(Roles = "Dev")]
        [HttpPost]
        public async Task<IActionResult> PublicarProjeto([FromBody] ProjetoCreateDTO dto)
        {
            var devIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(devIdClaim, out int devId)) return Unauthorized();

            var novoProjeto = new Projeto
            {
                Titulo = dto.Titulo,
                Descricao = dto.Descricao,
                LinkRepositorio = dto.LinkRepositorio,
                FotoUrl = dto.FotoUrl,
                VideoUrl = dto.VideoUrl,
                DataPublicacao = DateTime.Now,
                DevId = devId,
                AprovadoPeloAdmin = false,
                RecusadoPeloAdmin = false,
                MotivoRecusa = null
            };

            _context.Projetos.Add(novoProjeto);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProjetoPorId), new { id = novoProjeto.Id }, novoProjeto);
        }

        // ENDPOINT DE UPLOAD NATIVO DE ARQUIVOS FÍSICOS (Até 5 fotos e 1 vídeo - Web e Mobile)
        [Authorize(Roles = "Dev")]
        [HttpPost("upload-projeto")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(104_857_600)] // 100 MB para vídeos/fotos mobile
        [RequestFormLimits(MultipartBodyLengthLimit = 104_857_600, ValueCountLimit = 1024)]
        public async Task<IActionResult> UploadProjeto([FromForm] ProjetoUploadDTO dto)
        {
            var devIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(devIdClaim, out int devId)) return Unauthorized();

            if (string.IsNullOrWhiteSpace(dto.Titulo) || string.IsNullOrWhiteSpace(dto.Descricao) || string.IsNullOrWhiteSpace(dto.LinkRepositorio))
                return BadRequest(new { mensagem = "Título, Descrição e Link do Repositório são obrigatórios." });

            List<string> fotoUrls = new List<string>();
            string? videoUrlGerada = null;

            var webRootPath = _environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsPasta = Path.Combine(webRootPath, "uploads");

            if (!Directory.Exists(uploadsPasta))
                Directory.CreateDirectory(uploadsPasta);

            var fotosRecebidas = new List<IFormFile>();
            if (dto.Fotos != null && dto.Fotos.Count > 0)
            {
                fotosRecebidas.AddRange(dto.Fotos.Where(f => f != null && f.Length > 0));
            }
            if (Request.Form.Files.Count > 0)
            {
                foreach (var arquivo in Request.Form.Files)
                {
                    if (arquivo.Length > 0 &&
                        string.Equals(arquivo.Name, "Fotos", StringComparison.OrdinalIgnoreCase) &&
                        !fotosRecebidas.Contains(arquivo))
                    {
                        fotosRecebidas.Add(arquivo);
                    }
                }
            }

            foreach (var foto in fotosRecebidas.Take(5))
            {
                var extensao = Path.GetExtension(foto.FileName);
                if (string.IsNullOrWhiteSpace(extensao))
                    extensao = ".jpg";

                var nomeArquivo = Guid.NewGuid().ToString() + extensao;
                var caminhoCompleto = Path.Combine(uploadsPasta, nomeArquivo);
                using (var stream = new FileStream(caminhoCompleto, FileMode.Create))
                {
                    await foto.CopyToAsync(stream);
                }
                fotoUrls.Add($"/uploads/{nomeArquivo}");
            }

            var videoRecebido = dto.Video ?? Request.Form.Files.FirstOrDefault(f =>
                f.Length > 0 && string.Equals(f.Name, "Video", StringComparison.OrdinalIgnoreCase));

            if (videoRecebido != null && videoRecebido.Length > 0)
            {
                var extensaoVideo = Path.GetExtension(videoRecebido.FileName);
                if (string.IsNullOrWhiteSpace(extensaoVideo))
                    extensaoVideo = ".mp4";

                var nomeArquivo = Guid.NewGuid().ToString() + extensaoVideo;
                var caminhoCompleto = Path.Combine(uploadsPasta, nomeArquivo);
                using (var stream = new FileStream(caminhoCompleto, FileMode.Create))
                {
                    await videoRecebido.CopyToAsync(stream);
                }
                videoUrlGerada = $"/uploads/{nomeArquivo}";
            }

            var novoProjeto = new Projeto
            {
                Titulo = dto.Titulo.Trim(),
                Descricao = dto.Descricao.Trim(),
                LinkRepositorio = dto.LinkRepositorio.Trim(),
                FotoUrl = fotoUrls.FirstOrDefault(),
                VideoUrl = videoUrlGerada,
                DataPublicacao = DateTime.Now,
                DevId = devId,
                AprovadoPeloAdmin = false,
                RecusadoPeloAdmin = false,
                MotivoRecusa = null
            };
            novoProjeto.Fotos = fotoUrls;

            _context.Projetos.Add(novoProjeto);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetProjetoPorId), new { id = novoProjeto.Id }, new
            {
                novoProjeto.Id,
                novoProjeto.Titulo,
                novoProjeto.Descricao,
                novoProjeto.LinkRepositorio,
                novoProjeto.FotoUrl,
                Fotos = novoProjeto.Fotos,
                novoProjeto.VideoUrl,
                novoProjeto.AprovadoPeloAdmin,
                novoProjeto.RecusadoPeloAdmin,
                novoProjeto.MotivoRecusa,
                novoProjeto.DataPublicacao,
                novoProjeto.DevId
            });
        }

        [Authorize]
        [HttpPost("{id:int}/upvote")]
        public async Task<IActionResult> DarUpvote(int id)
        {
            var usuarioIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(usuarioIdClaim, out int usuarioId)) return Unauthorized();

            var projeto = await _context.Projetos.FindAsync(id);
            if (projeto == null) return NotFound(new { mensagem = "Projeto não encontrado." });

            var upvote = new Upvote
            {
                UsuarioId = usuarioId,
                ProjetoId = id,
                DataUpvote = DateTime.Now
            };

            _context.Upvotes.Add(upvote);

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { mensagem = "Upvote computado com sucesso!" });
            }
            catch (DbUpdateException)
            {
                return BadRequest(new { mensagem = "Você já deu upvote neste projeto." });
            }
        }

        [Authorize]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> AtualizarProjeto(int id, [FromBody] ProjetoUpdateDto dto)
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);

            var projeto = await _context.Projetos.FindAsync(id);

            if (projeto == null) return NotFound(new { mensagem = "Projeto não encontrado." });
            if (projeto.DevId != userId) return Forbid();

            projeto.Titulo = dto.Titulo ?? projeto.Titulo;
            projeto.Descricao = dto.Descricao ?? projeto.Descricao;
            projeto.LinkRepositorio = dto.LinkRepositorio ?? projeto.LinkRepositorio;
            projeto.FotoUrl = dto.FotoUrl ?? projeto.FotoUrl;
            projeto.VideoUrl = dto.VideoUrl ?? projeto.VideoUrl;

            _context.Projetos.Update(projeto);
            await _context.SaveChangesAsync();

            return Ok(projeto);
        }

        // REGRA APLICADA: Exclusão Mútua de Publicações (Admin + Autor)
        [Authorize]
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeletarProjeto(int id)
        {
            var userId = int.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)!.Value);
            var userRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            var projeto = await _context.Projetos.FindAsync(id);

            if (projeto == null) return NotFound(new { mensagem = "Projeto não encontrado." });

            if (projeto.DevId != userId && userRole != "Administrador")
                return Forbid();

            var upvotes = _context.Upvotes.Where(u => u.ProjetoId == id);
            _context.Upvotes.RemoveRange(upvotes);

            var favoritos = _context.Favoritos.Where(f => f.ProjetoId == id);
            _context.Favoritos.RemoveRange(favoritos);

            _context.Projetos.Remove(projeto);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("dev/{devId:int}")]
        public async Task<IActionResult> GetProjetosPorDev(int devId)
        {
            var projetosDb = await _context.Projetos
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
                TotalUpvotes = p.Upvotes.Count
            }).ToList();

            if (!projetos.Any())
                return NotFound(new { mensagem = "Nenhum projeto encontrado para este desenvolvedor." });

            return Ok(projetos);
        }
    }

    public class RejeitarProjetoDTO
    {
        public string? Motivo { get; set; }
    }
}