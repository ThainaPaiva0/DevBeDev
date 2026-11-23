const API_HOST =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5091'
        : window.location.origin;

const API_BASE_URL = `${API_HOST}/api`;

function extrairErro(data, padrao) {
    if (data && typeof data === 'string' && data.trim()) return data.trim();
    if (data && data.mensagem) return data.mensagem;
    if (data && data.Message) return data.Message;
    if (data && data.errors) return Object.values(data.errors).flat().join(' ');
    return padrao;
}

async function parseRespostaSegura(response) {
    const rawText = await response.text().catch(() => '');
    if (!rawText) return {};
    try {
        return JSON.parse(rawText);
    } catch {
        return { mensagem: rawText };
    }
}

const api = {
    getAuthHeader() {
        const token = localStorage.getItem('jwt_token');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    },

    async requestJson(path, options = {}, erroPadrao = 'Erro na comunicação com o servidor.') {
        try {
            const response = await fetch(`${API_BASE_URL}${path}`, options);
            const data = await parseRespostaSegura(response);
            if (!response.ok) {
                const err = new Error(extrairErro(data, erroPadrao));
                err.status = response.status;
                throw err;
            }
            return data;
        } catch (err) {
            if (err.name === 'TypeError') {
                throw new Error(`Falha de rede: não foi possível conectar à API em ${API_HOST}.`);
            }
            throw err;
        }
    },

    async login(email, senha) {
        return await this.requestJson('/usuarios/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        }, 'Falha no login');
    },

    async registrar(dados) {
        return await this.requestJson('/usuarios/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        }, 'Falha no cadastro');
    },

    async obterMeuPerfil() {
        return await this.requestJson('/usuarios/me', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao carregar perfil.');
    },

    async atualizarMeuPerfil(dados) {
        return await this.requestJson('/usuarios/me', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
            body: JSON.stringify(dados)
        }, 'Erro ao atualizar perfil.');
    },

    // POST /api/usuarios/foto-perfil (multipart/form-data, campo "foto")
    async enviarFotoPerfil(formData) {
        return await this.requestJson('/usuarios/foto-perfil', {
            method: 'POST',
            headers: { ...this.getAuthHeader() },
            body: formData
        }, 'Erro ao enviar a foto de perfil.');
    },

    // GET /api/usuarios/{id}/perfil-publico (público)
    async obterPerfilPublico(id) {
        return await this.requestJson(`/usuarios/${id}/perfil-publico`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }, 'Erro ao carregar o perfil do desenvolvedor.');
    },

    // GET /api/projetos/feed
    async getFeed(busca = '', pagina = 1, limite = 10) {
        const params = new URLSearchParams();
        if (busca) params.append('busca', busca);
        params.append('page', pagina);
        params.append('limit', limite);

        return await this.requestJson(`/projetos/feed?${params.toString()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }, 'Erro ao buscar o feed de projetos');
    },

    async publicarProjetoMultipart(formData) {
        return await this.requestJson('/projetos/upload-projeto', {
            method: 'POST',
            headers: { ...this.getAuthHeader() },
            body: formData
        }, 'Falha ao publicar o projeto com arquivos.');
    },

    async deletarProjeto(id) {
        await this.requestJson(`/projetos/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao excluir projeto.');
    },

    async upvote(projetoId) {
        return await this.requestJson(`/projetos/${projetoId}/upvote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao processar upvote.');
    },

    async getComentarios(projetoId) {
        return await this.requestJson(`/projetos/${projetoId}/comentarios`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }, 'Erro ao buscar comentários do projeto');
    },

    async enviarComentario(projetoId, texto) {
        const payload = typeof texto === 'string'
            ? { textoComentario: texto }
            : { textoComentario: texto?.textoComentario ?? texto?.TextoComentario ?? '' };

        return await this.requestJson(`/projetos/${projetoId}/comentarios`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
            body: JSON.stringify(payload)
        }, 'Erro ao enviar comentário.');
    },

    async favoritarProjeto(projetoId) {
        return await this.requestJson(`/recrutadores/projetos/${projetoId}/favoritar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao favoritar projeto.');
    },

    async getFavoritos() {
        return await this.requestJson('/recrutadores/favoritos', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao carregar favoritos.');
    },

    async desfavoritarProjeto(projetoId) {
        return await this.requestJson(`/recrutadores/projetos/${projetoId}/favoritar`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao remover favorito.');
    },

    async getContatosMensagens() {
        return await this.requestJson('/mensagens/contatos', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao carregar contatos.');
    },

    async getConversasMensagens() {
        return await this.requestJson('/mensagens/conversas', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao carregar conversas.');
    },

    async getHistoricoMensagens(outroUsuarioId) {
        return await this.requestJson(`/mensagens/${outroUsuarioId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() }
        }, 'Erro ao carregar histórico de mensagens.');
    },

    async enviarMensagemDireta(destinatarioId, conteudo) {
        return await this.requestJson('/mensagens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...this.getAuthHeader() },
            body: JSON.stringify({ destinatarioId, conteudo })
        }, 'Erro ao enviar mensagem.');
    }
};