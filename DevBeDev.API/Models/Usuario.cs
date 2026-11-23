namespace DevBeDev.API.Models
{
    public abstract class Usuario
    {
        public int Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string SenhaHash { get; set; } = string.Empty;
        public DateTime DataCadastro { get; set; } = DateTime.Now;
        public bool AprovadoPeloAdmin { get; set; } = false;
        public bool SolicitouUpgrade { get; set; } = false;
        public bool UpgradeRecusado { get; set; } = false;
        public string? MotivoRecusa { get; set; }

        // Campos auxiliares para processo de solicitação e migração de perfil TPH
        public string? TipoSolicitado { get; set; }
        public string? Bio { get; set; }
        public string? LinkGitHub { get; set; }
        public string? CnpjEmpresa { get; set; }
        public string? LinkLinkedIn { get; set; }

        public string? FotoPerfilUrl { get; set; }
    }
}