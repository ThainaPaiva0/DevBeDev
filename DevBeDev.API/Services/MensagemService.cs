using DevBeDev.API.Models;
using MongoDB.Driver;

namespace DevBeDev.API.Services
{
    public class MensagemService
    {
        private readonly IMongoCollection<MensagemDireta> _mensagensCollection;
        private readonly ILogger<MensagemService> _logger;

        public MensagemService(IMongoClient mongoClient, IConfiguration config, ILogger<MensagemService> logger)
        {
            _logger = logger;
            var connectionString = config["MongoDbSettings:ConnectionString"] ?? "mongodb://localhost:27017";
            var databaseName = config["MongoDbSettings:DatabaseName"] ?? "DevBeDevNoSQL";

            IMongoClient client = mongoClient;
            if (client == null && !string.IsNullOrWhiteSpace(connectionString))
            {
                client = new MongoClient(connectionString);
            }

            var mongoDatabase = client!.GetDatabase(databaseName);
            _mensagensCollection = mongoDatabase.GetCollection<MensagemDireta>("MensagensDiretas");
        }

        public async Task<MensagemDireta?> EnviarAsync(MensagemDireta mensagem)
        {
            try
            {
                mensagem.DataEnvio = DateTime.Now;
                await _mensagensCollection.InsertOneAsync(mensagem);
                return mensagem;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao inserir mensagem direta no MongoDB.");
                return null;
            }
        }

        public async Task<List<MensagemDireta>> ObterHistoricoAsync(int usuarioId, int outroUsuarioId)
        {
            try
            {
                var filtro = Builders<MensagemDireta>.Filter.Or(
                    Builders<MensagemDireta>.Filter.And(
                        Builders<MensagemDireta>.Filter.Eq(m => m.RemetenteId, usuarioId),
                        Builders<MensagemDireta>.Filter.Eq(m => m.DestinatarioId, outroUsuarioId)
                    ),
                    Builders<MensagemDireta>.Filter.And(
                        Builders<MensagemDireta>.Filter.Eq(m => m.RemetenteId, outroUsuarioId),
                        Builders<MensagemDireta>.Filter.Eq(m => m.DestinatarioId, usuarioId)
                    )
                );

                return await _mensagensCollection
                    .Find(filtro)
                    .SortBy(m => m.DataEnvio)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar histórico de mensagens no MongoDB.");
                return new List<MensagemDireta>();
            }
        }

        public async Task<List<MensagemDireta>> ObterMensagensDoUsuarioAsync(int usuarioId)
        {
            try
            {
                var filtro = Builders<MensagemDireta>.Filter.Or(
                    Builders<MensagemDireta>.Filter.Eq(m => m.RemetenteId, usuarioId),
                    Builders<MensagemDireta>.Filter.Eq(m => m.DestinatarioId, usuarioId)
                );

                return await _mensagensCollection
                    .Find(filtro)
                    .SortByDescending(m => m.DataEnvio)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar conversas do usuário {UsuarioId} no MongoDB.", usuarioId);
                return new List<MensagemDireta>();
            }
        }
    }
}
