using Microsoft.EntityFrameworkCore;
using DevBeDev.API.Models;

namespace DevBeDev.API.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Usuario> Usuarios { get; set; }
        public DbSet<Espectador> Espectadores { get; set; }
        public DbSet<Dev> Devs { get; set; }
        public DbSet<Recrutador> Recrutadores { get; set; }
        public DbSet<Administrador> Administradores { get; set; }
        public DbSet<Projeto> Projetos { get; set; }
        public DbSet<Upvote> Upvotes { get; set; }
        public DbSet<Favorito> Favoritos { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // 1. Configurando TPH (Table Per Hierarchy)
            modelBuilder.Entity<Usuario>()
                .HasDiscriminator<string>("TipoPerfil")
                .HasValue<Espectador>("Espectador")
                .HasValue<Dev>("Dev")
                .HasValue<Recrutador>("Recrutador")
                .HasValue<Administrador>("Administrador");

            // 2. Unicidade de Upvote por usuário e projeto
            modelBuilder.Entity<Upvote>()
                .HasIndex(u => new { u.UsuarioId, u.ProjetoId })
                .IsUnique();

            // 3. Desativando exclusão em cascata para evitar ciclos/múltiplos caminhos de deleção
            modelBuilder.Entity<Upvote>()
                .HasOne(u => u.Usuario)
                .WithMany()
                .HasForeignKey(u => u.UsuarioId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Upvote>()
                .HasOne(u => u.Projeto)
                .WithMany(p => p.Upvotes)
                .HasForeignKey(p => p.ProjetoId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Favorito>()
                .HasOne(f => f.Recrutador)
                .WithMany()
                .HasForeignKey(f => f.RecrutadorId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Favorito>()
                .HasOne(f => f.Projeto)
                .WithMany()
                .HasForeignKey(f => f.ProjetoId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}