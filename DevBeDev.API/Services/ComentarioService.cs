using DevBeDev.API.Models;
using MongoDB.Driver;

namespace DevBeDev.API.Services
{
    public class ComentarioService
    {
        private readonly IMongoCollection<Comentario> _comentariosCollection;
        private readonly ILogger<ComentarioService> _logger;

        public ComentarioService(IMongoClient mongoClient, IConfiguration config, ILogger<ComentarioService> logger)
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
            _comentariosCollection = mongoDatabase.GetCollection<Comentario>("Comentarios");
        }

        public async Task<List<Comentario>> GetPorProjetoAsync(int projetoId)
        {
            try
            {
                return await _comentariosCollection
                    .Find(c => c.ProjetoId == projetoId)
                    .SortByDescending(c => c.DataCriacao)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao buscar comentários do projeto {ProjetoId} no MongoDB.", projetoId);
                return new List<Comentario>();
            }
        }

        public async Task<bool> CriarAsync(Comentario comentario)
        {
            try
            {
                comentario.DataCriacao = comentario.DataCriacao == default ? DateTime.Now : comentario.DataCriacao;
                await _comentariosCollection.InsertOneAsync(comentario);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao inserir comentário para o projeto {ProjetoId} no MongoDB.", comentario.ProjetoId);
                return false;
            }
        }

        public async Task<bool> RemoverAsync(string id)
        {
            try
            {
                var resultado = await _comentariosCollection.DeleteOneAsync(c => c.Id == id);
                return resultado.DeletedCount > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao remover comentário {ComentarioId} no MongoDB.", id);
                return false;
            }
        }

        public async Task<Comentario?> ObterPorIdAsync(string id)
        {
            try
            {
                return await _comentariosCollection.Find(c => c.Id == id).FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter comentário {ComentarioId} no MongoDB.", id);
                return null;
            }
        }
    }
}