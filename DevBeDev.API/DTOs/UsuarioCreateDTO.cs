using System.ComponentModel.DataAnnotations;

namespace DevBeDev.API.DTOs
{
    public class UsuarioCreateDTO
    {
        [Required(ErrorMessage = "O nome é obrigatório.")]
        [StringLength(100, MinimumLength = 3, ErrorMessage = "O nome deve ter entre 3 e 100 caracteres.")]
        public string Nome { get; set; } = string.Empty;

        [Required(ErrorMessage = "O e-mail é obrigatório.")]
        [EmailAddress(ErrorMessage = "Formato de e-mail inválido.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "A senha é obrigatória.")]
        [MinLength(6, ErrorMessage = "A senha deve ter no mínimo 6 caracteres.")]
        public string Senha { get; set; } = string.Empty; 
        
        public string TipoPerfil { get; set; } = "Espectador"; 

        public string? Bio { get; set; }
        public string? LinkGitHub { get; set; }
        public string? CnpjEmpresa { get; set; }
        public string? LinkLinkedIn { get; set; }
    }
}