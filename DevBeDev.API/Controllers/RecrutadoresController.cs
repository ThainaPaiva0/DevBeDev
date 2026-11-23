using DevBeDev.API.Data;
using DevBeDev.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DevBeDev.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Recrutador")]
    public class RecrutadoresController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public RecrutadoresController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("projetos/{projetoId}/favoritar")]
        public async Task<IActionResult> FavoritarProjeto(int projetoId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            
            var existe = await _context.Favoritos.AnyAsync(f => f.RecrutadorId == userId && f.ProjetoId == projetoId);
            if (existe) return BadRequest(new { mensagem = "Projeto já favoritado." });

            var favorito = new Favorito { RecrutadorId = userId, ProjetoId = projetoId };
            _context.Favoritos.Add(favorito);
            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Projeto salvo com sucesso nos favoritos!" });
        }

        [HttpGet("favoritos")]
        public async Task<IActionResult> ListarFavoritos()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var favoritosDb = await _context.Favoritos
                .Where(f => f.RecrutadorId == userId)
                .Include(f => f.Projeto)
                .ThenInclude(p => p!.Autor)
                .Include(f => f.Projeto)
                .ThenInclude(p => p!.Upvotes)
                .ToListAsync();

            var favoritos = favoritosDb.AsEnumerable().Select(f => new
            {
                f.Id,
                f.DataFavorito,
                Projeto = new
                {
                    f.Projeto!.Id,
                    f.Projeto.Titulo,
                    f.Projeto.Descricao,
                    f.Projeto.LinkRepositorio,
                    f.Projeto.FotoUrl,
                    Fotos = f.Projeto.Fotos,
                    f.Projeto.VideoUrl,
                    f.Projeto.Tecnologias,
                    DevId = f.Projeto.DevId,
                    Autor = f.Projeto.Autor != null ? f.Projeto.Autor.Nome : "Anônimo",
                    AutorFotoPerfilUrl = f.Projeto.Autor != null ? f.Projeto.Autor.FotoPerfilUrl : null,
                    TotalVotos = f.Projeto.Upvotes.Count
                }
            }).ToList();

            return Ok(favoritos);
        }

        [HttpDelete("projetos/{projetoId}/favoritar")]
        public async Task<IActionResult> DesfavoritarProjeto(int projetoId)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var favorito = await _context.Favoritos
                .FirstOrDefaultAsync(f => f.RecrutadorId == userId && f.ProjetoId == projetoId);

            if (favorito == null)
                return NotFound(new { mensagem = "Projeto não encontrado nos favoritos." });

            _context.Favoritos.Remove(favorito);
            await _context.SaveChangesAsync();

            return Ok(new { mensagem = "Projeto removido dos favoritos com sucesso!" });
        }
    }
}