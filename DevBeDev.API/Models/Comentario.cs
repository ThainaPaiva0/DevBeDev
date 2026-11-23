using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DevBeDev.API.Models
{
    public class Comentario
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        // Vinculando ao banco relacional SQL
        [BsonElement("projetoId")]
        public int ProjetoId { get; set; }

        [BsonElement("usuarioNome")]
        public string UsuarioNome { get; set; } = string.Empty;

        [BsonElement("perfilTipo")]
        public string PerfilTipo { get; set; } = string.Empty; // "Dev", "Recrutador", "Espectador"

        [BsonElement("textoComentario")]
        public string TextoComentario { get; set; } = string.Empty;

        [BsonElement("dataCriacao")]
        public DateTime DataCriacao { get; set; } = DateTime.Now;

        [BsonElement("autorId")]
        public string AutorId { get; set; } = string.Empty;
    }
}