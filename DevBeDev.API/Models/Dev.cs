namespace DevBeDev.API.Models
{
    public class Dev : Usuario
    {
        public new string Bio { get; set; } = string.Empty;
        public new string LinkGitHub { get; set; } = string.Empty;
        public List<Projeto> ProjetosPublicados { get; set; } = new List<Projeto>();
    }
}