using DevBeDev.API.Data;
using DevBeDev.API.Models;
using Microsoft.EntityFrameworkCore;

namespace DevBeDev.API.Services
{
    public class ProjetoService
    {
        private readonly ApplicationDbContext _context;

        public ProjetoService(ApplicationDbContext context)
        {
            _context = context;
        }

        public IQueryable<Projeto> ObterQueryable() => _context.Projetos.AsQueryable();

        public async Task<Projeto?> ObterPorIdAsync(int id)
        {
            return await _context.Projetos
                .Include(p => p.Autor)
                .Include(p => p.Upvotes)
                .FirstOrDefaultAsync(p => p.Id == id);
        }

        public async Task<Projeto> CriarAsync(Projeto projeto)
        {
            _context.Projetos.Add(projeto);
            await _context.SaveChangesAsync();
            return projeto;
        }

        public async Task AtualizarAsync(Projeto projeto)
        {
            _context.Projetos.Update(projeto);
            await _context.SaveChangesAsync();
        }

        public async Task DeletarAsync(Projeto projeto)
        {
            _context.Projetos.Remove(projeto);
            await _context.SaveChangesAsync();
        }

        public async Task DarUpvoteAsync(Upvote upvote)
        {
            _context.Upvotes.Add(upvote);
            await _context.SaveChangesAsync();
        }
    }
}