namespace DevBeDev.API.DTOs
{
    public class UsuarioResponseDTO
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string TipoPerfil { get; set; } = string.Empty;
        public DateTime DataCadastro { get; set; }
        public string? FotoPerfilUrl { get; set; }
    }
}
