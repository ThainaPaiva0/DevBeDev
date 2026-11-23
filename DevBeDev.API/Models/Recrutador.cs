namespace DevBeDev.API.Models
{
    public class Recrutador : Usuario
    {
        public new string CnpjEmpresa { get; set; } = string.Empty;
        public new string LinkLinkedIn { get; set; } = string.Empty;
    }
}