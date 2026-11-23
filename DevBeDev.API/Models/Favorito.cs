namespace DevBeDev.API.Models
{
    public class Favorito
    {
        public int Id { get; set; }
        public int RecrutadorId { get; set; }
        public Recrutador? Recrutador { get; set; }
        public int ProjetoId { get; set; }
        public Projeto? Projeto { get; set; }
        public DateTime DataFavorito { get; set; } = DateTime.Now;
    }
}