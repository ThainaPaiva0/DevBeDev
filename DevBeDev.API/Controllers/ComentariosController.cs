using System.Security.Claims;
using System.Text.Json;
using DevBeDev.API.Models;
using DevBeDev.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DevBeDev.API.Controllers
{
    [ApiController]
    [Route("api/projetos/{projetoId:int}/comentarios")]
    public class ComentariosController : ControllerBase
    {
        private readonly ComentarioService _comentarioService;

        public ComentariosController(ComentarioService comentarioService)
        {
            _comentarioService = comentarioService;
        }

        [HttpGet]
        public async Task<IActionResult> Listar(int projetoId)
        {
            if (projetoId <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            var comentarios = await _comentarioService.GetPorProjetoAsync(projetoId);
            return Ok(comentarios);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Comentar(int projetoId, [FromBody] JsonElement body)
        {
            if (projetoId <= 0)
                return BadRequest(new { mensagem = "Identificador de projeto inválido." });

            string textoComentario = string.Empty;

            if (body.ValueKind == JsonValueKind.String)
            {
                textoComentario = body.GetString() ?? string.Empty;
            }
            else if (body.ValueKind == JsonValueKind.Object)
            {
                if (body.TryGetProperty("textoComentario", out var propCamel) && propCamel.ValueKind == JsonValueKind.String)
                    textoComentario = propCamel.GetString() ?? string.Empty;
                else if (body.TryGetProperty("TextoComentario", out var propPascal) && propPascal.ValueKind == JsonValueKind.String)
                    textoComentario = propPascal.GetString() ?? string.Empty;
                else if (body.TryGetProperty("conteudo", out var propConteudo) && propConteudo.ValueKind == JsonValueKind.String)
                    textoComentario = propConteudo.GetString() ?? string.Empty;
            }

            textoComentario = textoComentario.Trim();

            if (string.IsNullOrWhiteSpace(textoComentario))
                return BadRequest(new { mensagem = "O comentário não pode ser vazio." });

            if (textoComentario.Length > 2000)
                return BadRequest(new { mensagem = "O comentário deve ter no máximo 2000 caracteres." });

            var autorId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
            if (string.IsNullOrWhiteSpace(autorId))
                return Unauthorized(new { mensagem = "Usuário não autenticado." });

            var usuarioNome = User.FindFirst(ClaimTypes.Name)?.Value;
            if (string.IsNullOrWhiteSpace(usuarioNome))
                usuarioNome = User.FindFirst("name")?.Value ?? "Usuário";

            var perfilTipo = User.FindFirst(ClaimTypes.Role)?.Value;
            if (string.IsNullOrWhiteSpace(perfilTipo))
                perfilTipo = User.FindFirst("role")?.Value ?? "Espectador";

            var comentario = new Comentario
            {
                ProjetoId = projetoId,
                AutorId = autorId,
                UsuarioNome = usuarioNome,
                PerfilTipo = perfilTipo,
                TextoComentario = textoComentario,
                DataCriacao = DateTime.Now
            };

            var criado = await _comentarioService.CriarAsync(comentario);
            if (!criado)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { mensagem = "Serviço de comentários temporariamente indisponível." });

            return CreatedAtAction(nameof(Listar), new { projetoId }, comentario);
        }

        [Authorize]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeletarComentario(int projetoId, string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { mensagem = "Identificador de comentário inválido." });

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
            var comentario = await _comentarioService.ObterPorIdAsync(id);

            if (comentario == null || comentario.ProjetoId != projetoId)
                return NotFound(new { mensagem = "Comentário não encontrado." });

            bool ehAutor = !string.IsNullOrWhiteSpace(userId) && comentario.AutorId == userId;
            bool ehAdministrador = User.IsInRole("Administrador");

            if (!ehAutor && !ehAdministrador)
                return Forbid();

            var removido = await _comentarioService.RemoverAsync(id);
            if (!removido)
                return StatusCode(StatusCodes.Status503ServiceUnavailable, new { mensagem = "Não foi possível excluir o comentário no momento." });

            return NoContent();
        }
    }
}