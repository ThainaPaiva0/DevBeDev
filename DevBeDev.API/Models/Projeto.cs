using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace DevBeDev.API.Models
{
    public class Projeto
    {
        public int Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string Descricao { get; set; } = string.Empty;
        public string LinkRepositorio { get; set; } = string.Empty;
        public string? FotoUrl { get; set; }
        public string? FotosJson { get; set; }
        public string? VideoUrl { get; set; }
        public bool AprovadoPeloAdmin { get; set; } = false;
        public bool RecusadoPeloAdmin { get; set; } = false;
        public string? MotivoRecusa { get; set; }
        public DateTime DataPublicacao { get; set; } = DateTime.Now;
        
        // Chave Estrangeira para o Dev autor
        public int DevId { get; set; }
        public Dev? Autor { get; set; }

        public List<Upvote> Upvotes { get; set; } = new List<Upvote>();
        public List<string> Tecnologias { get; set; } = new List<string>();

        [NotMapped]
        public List<string> Fotos
        {
            get => string.IsNullOrEmpty(FotosJson) 
                ? (string.IsNullOrEmpty(FotoUrl) ? new List<string>() : new List<string> { FotoUrl }) 
                : JsonSerializer.Deserialize<List<string>>(FotosJson) ?? new List<string>();
            set => FotosJson = JsonSerializer.Serialize(value);
        }
    }
}