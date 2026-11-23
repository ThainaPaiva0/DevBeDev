using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace DevBeDev.API.Models
{
    public class MensagemDireta
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string? Id { get; set; }

        [BsonElement("remetenteId")]
        public int RemetenteId { get; set; }

        [BsonElement("remetenteNome")]
        public string RemetenteNome { get; set; } = string.Empty;

        [BsonElement("remetentePerfil")]
        public string RemetentePerfil { get; set; } = string.Empty;

        [BsonElement("destinatarioId")]
        public int DestinatarioId { get; set; }

        [BsonElement("destinatarioNome")]
        public string DestinatarioNome { get; set; } = string.Empty;

        [BsonElement("destinatarioPerfil")]
        public string DestinatarioPerfil { get; set; } = string.Empty;

        [BsonElement("conteudo")]
        public string Conteudo { get; set; } = string.Empty;

        [BsonElement("dataEnvio")]
        public DateTime DataEnvio { get; set; } = DateTime.Now;
    }
}