namespace DevBeDev.API.Models
{
    public class Upvote
    {
        public int Id { get; set; }
        public DateTime DataUpvote { get; set; } = DateTime.Now;

        // Quem deu o like (Qualquer usuário pode dar like)
        public int UsuarioId { get; set; }
        public Usuario? Usuario { get; set; }

        // Em qual projeto
        public int ProjetoId { get; set; }
        public Projeto? Projeto { get; set; }
    }
}