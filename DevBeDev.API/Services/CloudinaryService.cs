using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;

namespace DevBeDev.API.Services
{
    public class CloudinaryService
    {
        private readonly Cloudinary _cloudinary;
        private readonly ILogger<CloudinaryService> _logger;

        public CloudinaryService(IConfiguration configuration, ILogger<CloudinaryService> logger)
        {
            _logger = logger;

            var cloudName = configuration["Cloudinary:CloudName"]
                ?? Environment.GetEnvironmentVariable("Cloudinary__CloudName");
            var apiKey = configuration["Cloudinary:ApiKey"]
                ?? Environment.GetEnvironmentVariable("Cloudinary__ApiKey");
            var apiSecret = configuration["Cloudinary:ApiSecret"]
                ?? Environment.GetEnvironmentVariable("Cloudinary__ApiSecret");

            if (string.IsNullOrWhiteSpace(cloudName) ||
                string.IsNullOrWhiteSpace(apiKey) ||
                string.IsNullOrWhiteSpace(apiSecret))
            {
                throw new InvalidOperationException(
                    "Credenciais do Cloudinary não configuradas. Defina Cloudinary__CloudName, Cloudinary__ApiKey e Cloudinary__ApiSecret."
                );
            }

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account)
            {
                Api = { Secure = true }
            };
        }

        public async Task<string?> UploadImagemAsync(IFormFile arquivo, string pasta = "devbedev/imagens")
        {
            if (arquivo == null || arquivo.Length == 0)
                return null;

            await using var stream = arquivo.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(arquivo.FileName, stream),
                Folder = pasta,
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var resultado = await _cloudinary.UploadAsync(uploadParams);

            if (resultado.Error != null)
            {
                _logger.LogError("Erro ao enviar imagem para o Cloudinary: {Mensagem}", resultado.Error.Message);
                throw new Exception($"Falha no upload de imagem para o Cloudinary: {resultado.Error.Message}");
            }

            return resultado.SecureUrl?.ToString();
        }

        public async Task<string?> UploadVideoAsync(IFormFile arquivo, string pasta = "devbedev/videos")
        {
            if (arquivo == null || arquivo.Length == 0)
                return null;

            await using var stream = arquivo.OpenReadStream();
            var uploadParams = new VideoUploadParams
            {
                File = new FileDescription(arquivo.FileName, stream),
                Folder = pasta,
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var resultado = await _cloudinary.UploadAsync(uploadParams);

            if (resultado.Error != null)
            {
                _logger.LogError("Erro ao enviar vídeo para o Cloudinary: {Mensagem}", resultado.Error.Message);
                throw new Exception($"Falha no upload de vídeo para o Cloudinary: {resultado.Error.Message}");
            }

            return resultado.SecureUrl?.ToString();
        }
    }
}