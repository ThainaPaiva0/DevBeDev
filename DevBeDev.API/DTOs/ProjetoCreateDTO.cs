using System.ComponentModel.DataAnnotations;

namespace DevBeDev.API.DTOs
{
    public class ProjetoCreateDTO
    {
        [Required(ErrorMessage = "O título é obrigatório.")]
        public string Titulo { get; set; } = string.Empty;

        [Required(ErrorMessage = "A descrição é obrigatória.")]
        public string Descricao { get; set; } = string.Empty;

        [Required(ErrorMessage = "O link do repositório é obrigatório.")]
        [Url(ErrorMessage = "Formato de URL inválido.")]
        public string LinkRepositorio { get; set; } = string.Empty;

        public string? FotoUrl { get; set; }
        public string? VideoUrl { get; set; }
    }
}