document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);

    const API_HOST =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:5091'
            : window.location.origin;

    // Avatar padrão (SVG embutido) para usuários sem foto de perfil
    const AVATAR_PADRAO = 'data:image/svg+xml;utf8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
        '<rect width="64" height="64" fill="#323238"/>' +
        '<circle cx="32" cy="24" r="12" fill="#a8a8b3"/>' +
        '<path d="M8 64c0-14 10-24 24-24s24 10 24 24z" fill="#a8a8b3"/></svg>'
    );

    const feed = $('feed-projetos');
    const template = $('projeto-template');
    const inputBusca = $('input-busca');
    const btnBuscar = $('btn-buscar');
    const logoHome = $('logo-home');

    const linkLogin = $('link-login');
    const linkRegistro = $('link-registro');
    const linkLogout = $('link-logout');
    const linkPublicar = $('link-publicar');
    const linkSolicitarUpgrade = $('link-solicitar-upgrade');
    const linkAdminPainel = $('link-admin-painel');
    const linkPerfil = $('link-perfil');
    const linkFavoritos = $('link-favoritos');
    const linkMeusProjetos = $('link-meus-projetos');
    const linkMensagens = $('link-mensagens');

    const modalLogin = $('modal-login');
    const modalRegistro = $('modal-registro');
    const modalPublicar = $('modal-publicar');
    const modalUpgrade = $('modal-upgrade');
    const modalAdminPainel = $('modal-admin-painel');
    const modalPerfil = $('modal-perfil');
    const modalPerfilDev = $('modal-perfil-dev');
    const modalMeusProjetos = $('modal-meus-projetos');
    const modalMensagens = $('modal-mensagens');
    const modalRecorteImagem = $('modal-recorte-imagem');
    const modalRecusarMotivo = $('modal-recusar-motivo');
    const lightboxModal = $('lightbox-modal');
    const lightboxImg = $('lightbox-img');
    const lightboxFechar = $('lightbox-fechar');

    const formLogin = $('form-login');
    const formRegistro = $('form-registro');
    const formPublicar = $('form-publicar');
    const formUpgrade = $('form-upgrade');
    const formPerfil = $('form-perfil');
    const formRecusarMotivo = $('form-recusar-motivo');
    const formEnviarMensagem = $('form-enviar-mensagem');

    const loginErro = $('login-erro');
    const registroErro = $('registro-erro');
    const publicarErro = $('publicar-erro');
    const upgradeErro = $('upgrade-erro');
    const perfilErro = $('perfil-erro');
    const recusarMotivoErro = $('recusar-motivo-erro');

    const perfilAlertasRecusa = $('perfil-alertas-recusa');

    const selectUpgradeTipo = $('upgrade-tipo');
    const upgradeCamposDev = $('upgrade-campos-dev');
    const upgradeCamposRecrutador = $('upgrade-campos-recrutador');

    const perfilCamposDev = $('perfil-campos-dev');
    const perfilCamposRecrutador = $('perfil-campos-recrutador');
    const perfilFotoPreview = $('perfil-foto-preview');
    const inputPerfilFoto = $('perfil-foto');
    const perfilFotoSelecionadaBox = $('perfil-foto-selecionada-box');

    const inputPublicarFotos = $('publicar-file-foto');
    const inputPublicarVideo = $('publicar-video');
    const publicarFotosPreview = $('publicar-fotos-preview');
    const publicarVideoPreview = $('publicar-video-preview');

    const listaMeusProjetos = $('lista-meus-projetos');

    const btnTabUpgrades = $('btn-tab-upgrades');
    const btnTabProjetos = $('btn-tab-projetos');
    const btnTabUsuarios = $('btn-tab-usuarios');
    const abaUpgrades = $('aba-upgrades');
    const abaProjetos = $('aba-projetos');
    const abaUsuarios = $('aba-usuarios');
    const listaUpgradesPendentes = $('lista-upgrades-pendentes');
    const listaProjetosPendentes = $('lista-projetos-pendentes');
    const listaUsuariosTodos = $('lista-usuarios-todos');

    // Chat
    const chatBuscaContato = $('chat-busca-contato');
    const chatListaConversas = $('chat-lista-conversas');
    const chatListaContatos = $('chat-lista-contatos');
    const chatHeaderAtivo = $('chat-header-ativo');
    const chatMensagensLista = $('chat-mensagens-lista');
    const chatInputMensagem = $('chat-input-mensagem');

    // Recorte com Canvas
    const recorteCanvas = $('recorte-canvas');
    const recorteCtx = recorteCanvas ? recorteCanvas.getContext('2d') : null;
    const recorteZoom = $('recorte-zoom');
    const recorteZoomValor = $('recorte-zoom-valor');
    const btnRecorteResetar = $('btn-recorte-resetar');
    const btnRecorteCancelar = $('btn-recorte-cancelar');
    const btnRecorteConfirmar = $('btn-recorte-confirmar');

    let acaoRecusaPendente = null;

    // Estado de mídias selecionadas (para permitir remoção individual e recorte)
    let fotosProjetoSelecionadas = []; // Array de { id, file, url }
    let videoProjetoSelecionado = null; // { file, name } | null
    let fotoPerfilSelecionada = null; // { file, url } | null

    // Estado do Canvas de Recorte
    let recorteEstado = {
        img: null,
        nomeArquivo: 'imagem.jpg',
        tipoMime: 'image/jpeg',
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        arrastando: false,
        inicioX: 0,
        inicioY: 0,
        onConfirmar: null
    };

    // Estado do Chat Direto
    let chatConversasCache = [];
    let chatContatosCache = [];
    let chatContatoAtivo = null;

    const CLAIM_ROLE_URI = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
    const CLAIM_NAMEID_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

    function lerPayload(token) {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            const json = decodeURIComponent(
                atob(base64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
            );
            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    function obterPerfil() {
        const token = localStorage.getItem('jwt_token');
        if (!token) return null;
        const payload = lerPayload(token);
        if (!payload) return null;
        const role = payload[CLAIM_ROLE_URI] ?? payload.role;
        return Array.isArray(role) ? role[0] : role;
    }

    function obterMeuId() {
        const token = localStorage.getItem('jwt_token');
        if (!token) return null;
        const payload = lerPayload(token);
        if (!payload) return null;
        const rawId = payload[CLAIM_NAMEID_URI] ?? payload.nameid ?? payload.sub;
        const parsed = parseInt(rawId, 10);
        return Number.isNaN(parsed) ? null : parsed;
    }

    function resolverUrl(url) {
        if (!url || typeof url !== 'string') return null;
        const limpa = url.trim();
        if (!limpa) return null;
        if (/^https?:\/\//i.test(limpa) || limpa.startsWith('data:') || limpa.startsWith('blob:')) {
            return limpa;
        }
        const caminho = limpa.startsWith('/') ? limpa : `/${limpa}`;
        return `${API_HOST}${caminho}`;
    }

    function fotoPerfilOuPadrao(url) {
        return resolverUrl(url) || AVATAR_PADRAO;
    }

    function urlSegura(url) {
        return typeof url === 'string' && /^https?:\/\//i.test(url.trim());
    }

    function abrirModal(modal) { if (modal) modal.hidden = false; }
    function fecharModal(modal) { if (modal) modal.hidden = true; }
    function mostrarErro(el, msg) { if (el) { el.textContent = msg; el.hidden = false; } }
    function limparErro(el) { if (el) { el.textContent = ''; el.hidden = true; } }

    // Olhinho para ver/ocultar senha nos modais de Login e Cadastro
    document.querySelectorAll('.btn-toggle-senha').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputAlvo = $(btn.dataset.target);
            if (!inputAlvo) return;
            const visivel = inputAlvo.type === 'text';
            inputAlvo.type = visivel ? 'password' : 'text';
            btn.textContent = visivel ? '👁' : '🙈';
        });
    });

    // Fechar modais ao clicar no X ou fora do conteúdo
    document.querySelectorAll('[data-fechar]').forEach(btn => {
        btn.addEventListener('click', () => fecharModal($(btn.dataset.fechar)));
    });

    [
        modalLogin, modalRegistro, modalPublicar, modalUpgrade, modalAdminPainel,
        modalPerfil, modalPerfilDev, modalMeusProjetos, modalMensagens,
        modalRecorteImagem, modalRecusarMotivo, lightboxModal
    ].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) fecharModal(modal);
            });
        }
    });

    if (lightboxFechar) {
        lightboxFechar.addEventListener('click', () => fecharModal(lightboxModal));
    }

    if ($('btn-cancelar-recusa')) {
        $('btn-cancelar-recusa').addEventListener('click', () => {
            acaoRecusaPendente = null;
            fecharModal(modalRecusarMotivo);
        });
    }

    function abrirModalRecusa({ titulo, subtitulo, onConfirmar }) {
        acaoRecusaPendente = onConfirmar;
        $('recusar-modal-titulo').textContent = titulo;
        $('recusar-modal-subtitulo').textContent = subtitulo;
        $('recusar-motivo-input').value = '';
        limparErro(recusarMotivoErro);
        abrirModal(modalRecusarMotivo);
        setTimeout(() => $('recusar-motivo-input')?.focus(), 50);
    }

    formRecusarMotivo.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErro(recusarMotivoErro);
        const motivo = $('recusar-motivo-input').value.trim();
        if (!motivo) {
            mostrarErro(recusarMotivoErro, 'Informe o motivo da recusa.');
            return;
        }
        if (typeof acaoRecusaPendente === 'function') {
            try {
                await acaoRecusaPendente(motivo);
                acaoRecusaPendente = null;
                fecharModal(modalRecusarMotivo);
            } catch (err) {
                mostrarErro(recusarMotivoErro, err.message || 'Falha ao enviar recusa.');
            }
        }
    });

    if (logoHome) {
        logoHome.addEventListener('click', () => {
            if (inputBusca) inputBusca.value = '';
            [
                modalLogin, modalRegistro, modalPublicar, modalUpgrade, modalAdminPainel,
                modalPerfil, modalPerfilDev, modalMeusProjetos, modalMensagens,
                modalRecorteImagem, modalRecusarMotivo, lightboxModal
            ].forEach(fecharModal);
            carregarFeed();
        });
    }

    linkLogin.addEventListener('click', (e) => { e.preventDefault(); limparErro(loginErro); abrirModal(modalLogin); });
    linkRegistro.addEventListener('click', (e) => { e.preventDefault(); limparErro(registroErro); abrirModal(modalRegistro); });
    linkPublicar.addEventListener('click', (e) => { e.preventDefault(); limparErro(publicarErro); abrirModal(modalPublicar); });
    linkSolicitarUpgrade.addEventListener('click', (e) => { e.preventDefault(); limparErro(upgradeErro); abrirModal(modalUpgrade); });
    linkAdminPainel.addEventListener('click', (e) => { e.preventDefault(); abrirModal(modalAdminPainel); carregarPainelAdmin(); });

    linkMeusProjetos.addEventListener('click', async (e) => {
        e.preventDefault();
        abrirModal(modalMeusProjetos);
        await carregarMeusProjetos();
    });

    linkMensagens.addEventListener('click', async (e) => {
        e.preventDefault();
        abrirModal(modalMensagens);
        await carregarChatInicial();
    });

    $('login-para-registro').addEventListener('click', (e) => {
        e.preventDefault();
        fecharModal(modalLogin);
        limparErro(registroErro);
        abrirModal(modalRegistro);
    });

    $('registro-para-login').addEventListener('click', (e) => {
        e.preventDefault();
        fecharModal(modalRegistro);
        limparErro(loginErro);
        abrirModal(modalLogin);
    });

    // =========================================================================
    // RECORTE COM <canvas> NATIVO E PRÉ-VISUALIZAÇÃO / REMOÇÃO DE MÍDIAS
    // =========================================================================
    function desenharRecorteCanvas() {
        if (!recorteCanvas || !recorteCtx || !recorteEstado.img) return;
        const size = recorteCanvas.width;
        recorteCtx.clearRect(0, 0, size, size);
        recorteCtx.fillStyle = '#121214';
        recorteCtx.fillRect(0, 0, size, size);

        const img = recorteEstado.img;
        const escalaBase = Math.max(size / img.width, size / img.height);
        const escalaFinal = escalaBase * recorteEstado.zoom;
        const drawW = img.width * escalaFinal;
        const drawH = img.height * escalaFinal;
        const dx = (size - drawW) / 2 + recorteEstado.offsetX;
        const dy = (size - drawH) / 2 + recorteEstado.offsetY;

        recorteCtx.drawImage(img, dx, dy, drawW, drawH);
    }

    function abrirModalRecorte(file, onConfirmar) {
        if (!file || !recorteCanvas || !recorteCtx) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                recorteEstado = {
                    img,
                    nomeArquivo: file.name || 'imagem-recortada.jpg',
                    tipoMime: file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg',
                    zoom: 1,
                    offsetX: 0,
                    offsetY: 0,
                    arrastando: false,
                    inicioX: 0,
                    inicioY: 0,
                    onConfirmar
                };
                if (recorteZoom) recorteZoom.value = '1';
                if (recorteZoomValor) recorteZoomValor.textContent = '100%';
                desenharRecorteCanvas();
                abrirModal(modalRecorteImagem);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    }

    if (recorteZoom) {
        recorteZoom.addEventListener('input', () => {
            recorteEstado.zoom = parseFloat(recorteZoom.value) || 1;
            if (recorteZoomValor) recorteZoomValor.textContent = `${Math.round(recorteEstado.zoom * 100)}%`;
            desenharRecorteCanvas();
        });
    }

    if (btnRecorteResetar) {
        btnRecorteResetar.addEventListener('click', () => {
            recorteEstado.zoom = 1;
            recorteEstado.offsetX = 0;
            recorteEstado.offsetY = 0;
            if (recorteZoom) recorteZoom.value = '1';
            if (recorteZoomValor) recorteZoomValor.textContent = '100%';
            desenharRecorteCanvas();
        });
    }

    if (btnRecorteCancelar) {
        btnRecorteCancelar.addEventListener('click', () => {
            recorteEstado.onConfirmar = null;
            fecharModal(modalRecorteImagem);
        });
    }

    if (recorteCanvas) {
        recorteCanvas.addEventListener('pointerdown', (e) => {
            recorteEstado.arrastando = true;
            recorteEstado.inicioX = e.clientX - recorteEstado.offsetX;
            recorteEstado.inicioY = e.clientY - recorteEstado.offsetY;
            recorteCanvas.setPointerCapture(e.pointerId);
        });

        recorteCanvas.addEventListener('pointermove', (e) => {
            if (!recorteEstado.arrastando) return;
            recorteEstado.offsetX = e.clientX - recorteEstado.inicioX;
            recorteEstado.offsetY = e.clientY - recorteEstado.inicioY;
            desenharRecorteCanvas();
        });

        recorteCanvas.addEventListener('pointerup', (e) => {
            recorteEstado.arrastando = false;
            if (recorteCanvas.hasPointerCapture(e.pointerId)) {
                recorteCanvas.releasePointerCapture(e.pointerId);
            }
        });
    }

    if (btnRecorteConfirmar && recorteCanvas) {
        btnRecorteConfirmar.addEventListener('click', () => {
            if (!recorteEstado.img || typeof recorteEstado.onConfirmar !== 'function') return;
            const mimeSaida = recorteEstado.tipoMime === 'image/png' ? 'image/png' : 'image/jpeg';
            recorteCanvas.toBlob((blob) => {
                if (!blob) return;
                const arquivoRecortado = new File([blob], recorteEstado.nomeArquivo, { type: mimeSaida });
                const cb = recorteEstado.onConfirmar;
                recorteEstado.onConfirmar = null;
                fecharModal(modalRecorteImagem);
                cb(arquivoRecortado);
            }, mimeSaida, 0.92);
        });
    }

    function renderizarPreviewFotosProjeto() {
        if (!publicarFotosPreview) return;
        publicarFotosPreview.innerHTML = '';

        fotosProjetoSelecionadas.forEach((item, idx) => {
            const box = document.createElement('div');
            box.className = 'preview-item';

            const btnRemover = document.createElement('button');
            btnRemover.type = 'button';
            btnRemover.className = 'btn-remover-midia';
            btnRemover.title = 'Remover foto';
            btnRemover.textContent = '✕';
            btnRemover.addEventListener('click', () => {
                if (item.url) URL.revokeObjectURL(item.url);
                fotosProjetoSelecionadas.splice(idx, 1);
                renderizarPreviewFotosProjeto();
            });

            const img = document.createElement('img');
            img.src = item.url;
            img.alt = `Foto ${idx + 1}`;
            img.className = 'preview-thumb';

            const btnRecortar = document.createElement('button');
            btnRecortar.type = 'button';
            btnRecortar.className = 'btn-recortar-thumb';
            btnRecortar.textContent = '✂ Recortar';
            btnRecortar.addEventListener('click', () => {
                abrirModalRecorte(item.file, (novoArquivo) => {
                    if (item.url) URL.revokeObjectURL(item.url);
                    fotosProjetoSelecionadas[idx] = {
                        file: novoArquivo,
                        url: URL.createObjectURL(novoArquivo)
                    };
                    renderizarPreviewFotosProjeto();
                });
            });

            box.appendChild(btnRemover);
            box.appendChild(img);
            box.appendChild(btnRecortar);
            publicarFotosPreview.appendChild(box);
        });
    }

    function renderizarPreviewVideoProjeto() {
        if (!publicarVideoPreview) return;
        publicarVideoPreview.innerHTML = '';
        if (!videoProjetoSelecionado) return;

        const box = document.createElement('div');
        box.className = 'preview-item';

        const btnRemover = document.createElement('button');
        btnRemover.type = 'button';
        btnRemover.className = 'btn-remover-midia';
        btnRemover.title = 'Remover vídeo';
        btnRemover.textContent = '✕';
        btnRemover.addEventListener('click', () => {
            videoProjetoSelecionado = null;
            if (inputPublicarVideo) inputPublicarVideo.value = '';
            renderizarPreviewVideoProjeto();
        });

        const badge = document.createElement('div');
        badge.className = 'preview-video-badge';
        badge.textContent = `🎥 ${videoProjetoSelecionado.name}`;

        box.appendChild(btnRemover);
        box.appendChild(badge);
        publicarVideoPreview.appendChild(box);
    }

    function renderizarPreviewFotoPerfil() {
        if (!perfilFotoSelecionadaBox) return;
        perfilFotoSelecionadaBox.innerHTML = '';
        if (!fotoPerfilSelecionada) return;

        const box = document.createElement('div');
        box.className = 'preview-item';

        const btnRemover = document.createElement('button');
        btnRemover.type = 'button';
        btnRemover.className = 'btn-remover-midia';
        btnRemover.title = 'Remover foto selecionada';
        btnRemover.textContent = '✕';
        btnRemover.addEventListener('click', () => {
            if (fotoPerfilSelecionada?.url) URL.revokeObjectURL(fotoPerfilSelecionada.url);
            fotoPerfilSelecionada = null;
            if (inputPerfilFoto) inputPerfilFoto.value = '';
            if (perfilFotoPreview) perfilFotoPreview.src = AVATAR_PADRAO;
            renderizarPreviewFotoPerfil();
        });

        const img = document.createElement('img');
        img.src = fotoPerfilSelecionada.url;
        img.alt = 'Prévia foto de perfil';
        img.className = 'preview-thumb';

        const btnRecortar = document.createElement('button');
        btnRecortar.type = 'button';
        btnRecortar.className = 'btn-recortar-thumb';
        btnRecortar.textContent = '✂ Recortar';
        btnRecortar.addEventListener('click', () => {
            abrirModalRecorte(fotoPerfilSelecionada.file, (novoArquivo) => {
                if (fotoPerfilSelecionada?.url) URL.revokeObjectURL(fotoPerfilSelecionada.url);
                const novaUrl = URL.createObjectURL(novoArquivo);
                fotoPerfilSelecionada = { file: novoArquivo, url: novaUrl };
                if (perfilFotoPreview) perfilFotoPreview.src = novaUrl;
                renderizarPreviewFotoPerfil();
            });
        });

        box.appendChild(btnRemover);
        box.appendChild(img);
        box.appendChild(btnRecortar);
        perfilFotoSelecionadaBox.appendChild(box);
    }

    function limparMidiasFormularioPublicar() {
        fotosProjetoSelecionadas.forEach(f => f.url && URL.revokeObjectURL(f.url));
        fotosProjetoSelecionadas = [];
        videoProjetoSelecionado = null;
        if (inputPublicarFotos) inputPublicarFotos.value = '';
        if (inputPublicarVideo) inputPublicarVideo.value = '';
        renderizarPreviewFotosProjeto();
        renderizarPreviewVideoProjeto();
    }

    if (inputPublicarFotos) {
        inputPublicarFotos.addEventListener('change', () => {
            const arquivos = Array.from(inputPublicarFotos.files || []);
            if (arquivos.length === 0) return;

            fotosProjetoSelecionadas.forEach(f => f.url && URL.revokeObjectURL(f.url));
            fotosProjetoSelecionadas = arquivos.slice(0, 5).map(file => ({
                file,
                url: URL.createObjectURL(file)
            }));
            inputPublicarFotos.value = '';
            renderizarPreviewFotosProjeto();
        });
    }

    if (inputPublicarVideo) {
        inputPublicarVideo.addEventListener('change', () => {
            const arquivo = inputPublicarVideo.files?.[0];
            if (!arquivo) {
                videoProjetoSelecionado = null;
                renderizarPreviewVideoProjeto();
                return;
            }
            videoProjetoSelecionado = {
                file: arquivo,
                name: arquivo.name || 'video.mp4'
            };
            renderizarPreviewVideoProjeto();
        });
    }

    function renderizarAlertasRecusaPerfil(perfil) {
        if (!perfilAlertasRecusa) return;
        perfilAlertasRecusa.innerHTML = '';

        if (perfil.upgradeRecusado && perfil.motivoRecusa) {
            const alertaUpgrade = document.createElement('div');
            alertaUpgrade.style.background = 'rgba(247, 90, 104, 0.14)';
            alertaUpgrade.style.border = '1px solid #f75a68';
            alertaUpgrade.style.borderRadius = '14px';
            alertaUpgrade.style.padding = '12px 14px';
            alertaUpgrade.style.color = '#ffd6db';

            const titulo = document.createElement('strong');
            titulo.style.color = '#f75a68';
            titulo.style.display = 'block';
            titulo.style.marginBottom = '4px';
            titulo.textContent = `⚠ Solicitação de Upgrade (${perfil.tipoSolicitado || 'Perfil'}) Recusada`;

            const motivo = document.createElement('p');
            motivo.style.fontSize = '0.88rem';
            motivo.style.margin = '0';
            motivo.textContent = `Motivo do Administrador: ${perfil.motivoRecusa}`;

            alertaUpgrade.appendChild(titulo);
            alertaUpgrade.appendChild(motivo);
            perfilAlertasRecusa.appendChild(alertaUpgrade);
        }

        const projetosRecusados = (perfil.projetos || []).filter(p => p.recusadoPeloAdmin && p.motivoRecusa);
        projetosRecusados.forEach(proj => {
            const alertaProj = document.createElement('div');
            alertaProj.style.background = 'rgba(247, 90, 104, 0.14)';
            alertaProj.style.border = '1px solid #f75a68';
            alertaProj.style.borderRadius = '14px';
            alertaProj.style.padding = '12px 14px';
            alertaProj.style.color = '#ffd6db';

            const titulo = document.createElement('strong');
            titulo.style.color = '#f75a68';
            titulo.style.display = 'block';
            titulo.style.marginBottom = '4px';
            titulo.textContent = `⚠ Projeto "${proj.titulo}" Recusado`;

            const motivo = document.createElement('p');
            motivo.style.fontSize = '0.88rem';
            motivo.style.margin = '0';
            motivo.textContent = `Motivo do Administrador: ${proj.motivoRecusa}`;

            alertaProj.appendChild(titulo);
            alertaProj.appendChild(motivo);
            perfilAlertasRecusa.appendChild(alertaProj);
        });
    }

    linkPerfil.addEventListener('click', async (e) => {
        e.preventDefault();
        limparErro(perfilErro);
        try {
            const perfil = await api.obterMeuPerfil();
            $('perfil-nome').value = perfil.nome || '';
            perfilFotoPreview.src = fotoPerfilOuPadrao(perfil.fotoPerfilUrl);
            inputPerfilFoto.value = '';
            if (fotoPerfilSelecionada?.url) URL.revokeObjectURL(fotoPerfilSelecionada.url);
            fotoPerfilSelecionada = null;
            renderizarPreviewFotoPerfil();

            renderizarAlertasRecusaPerfil(perfil);

            const role = obterPerfil();
            perfilCamposDev.hidden = role !== 'Dev';
            perfilCamposRecrutador.hidden = role !== 'Recrutador';

            if (role === 'Dev') {
                $('perfil-bio').value = perfil.bio || '';
                $('perfil-github').value = perfil.linkGitHub || '';
            } else if (role === 'Recrutador') {
                $('perfil-cnpj').value = perfil.cnpjEmpresa || '';
                $('perfil-linkedin').value = perfil.linkLinkedIn || '';
            }

            abrirModal(modalPerfil);
        } catch (err) {
            alert(err.message);
        }
    });

    inputPerfilFoto.addEventListener('change', () => {
        const arquivo = inputPerfilFoto.files?.[0];
        if (!arquivo) return;
        if (fotoPerfilSelecionada?.url) URL.revokeObjectURL(fotoPerfilSelecionada.url);
        const url = URL.createObjectURL(arquivo);
        fotoPerfilSelecionada = { file: arquivo, url };
        perfilFotoPreview.src = url;
        inputPerfilFoto.value = '';
        renderizarPreviewFotoPerfil();
    });

    linkFavoritos.addEventListener('click', async (e) => {
        e.preventDefault();
        await carregarFavoritos();
    });

    async function atualizarNav() {
        const token = localStorage.getItem('jwt_token');
        const logado = !!token;

        const aplicarVisibilidade = () => {
            const perfilAtual = obterPerfil();
            const podeChat = logado && (perfilAtual === 'Dev' || perfilAtual === 'Recrutador' || perfilAtual === 'Administrador');

            linkLogin.hidden = logado;
            linkRegistro.hidden = logado;
            linkLogout.hidden = !logado;

            linkPublicar.hidden = !(logado && perfilAtual === 'Dev');
            linkMeusProjetos.hidden = !(logado && perfilAtual === 'Dev');
            linkMensagens.hidden = !podeChat;
            linkSolicitarUpgrade.hidden = !(logado && perfilAtual === 'Espectador');
            linkAdminPainel.hidden = !(logado && perfilAtual === 'Administrador');
            linkPerfil.hidden = !logado;
            linkFavoritos.hidden = !(logado && perfilAtual === 'Recrutador');
        };

        aplicarVisibilidade();

        if (logado) {
            try {
                const response = await fetch(`${API_HOST}/api/usuarios/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const tokenAtualizado = data.novoToken || data.NovoToken;
                    if (tokenAtualizado) {
                        localStorage.setItem('jwt_token', tokenAtualizado);
                        aplicarVisibilidade();
                    }
                } else if (response.status === 401) {
                    localStorage.removeItem('jwt_token');
                    aplicarVisibilidade();
                }
            } catch (err) {
                console.error("Erro ao validar token/renovar:", err);
            }
        }
    }

    function encerrarSessao() {
        localStorage.removeItem('jwt_token');
        chatContatoAtivo = null;
        atualizarNav();
        carregarFeed();
    }

    linkLogout.addEventListener('click', (e) => { e.preventDefault(); encerrarSessao(); });

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErro(loginErro);
        try {
            const data = await api.login($('login-email').value.trim(), $('login-senha').value);
            localStorage.setItem('jwt_token', data.token);
            formLogin.reset();
            fecharModal(modalLogin);
            await atualizarNav();
            carregarFeed();
        } catch (err) {
            mostrarErro(loginErro, err.message);
        }
    });

    formRegistro.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErro(registroErro);
        const email = $('registro-email').value.trim();
        const senha = $('registro-senha').value;
        const dados = { nome: $('registro-nome').value.trim(), email, senha };

        try {
            await api.registrar(dados);
            const data = await api.login(email, senha);
            localStorage.setItem('jwt_token', data.token);
            formRegistro.reset();
            fecharModal(modalRegistro);
            await atualizarNav();
            carregarFeed();
        } catch (err) {
            mostrarErro(registroErro, err.message);
        }
    });

    formPerfil.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErro(perfilErro);
        const role = obterPerfil();
        const payload = {
            nome: $('perfil-nome').value.trim(),
            bio: role === 'Dev' ? $('perfil-bio')?.value.trim() : null,
            linkGitHub: role === 'Dev' ? $('perfil-github')?.value.trim() : null,
            cnpjEmpresa: role === 'Recrutador' ? $('perfil-cnpj')?.value.trim() : null,
            linkLinkedIn: role === 'Recrutador' ? $('perfil-linkedin')?.value.trim() : null
        };

        try {
            await api.atualizarMeuPerfil(payload);

            if (fotoPerfilSelecionada?.file) {
                const formData = new FormData();
                formData.append('foto', fotoPerfilSelecionada.file, fotoPerfilSelecionada.file.name || 'foto-perfil.jpg');
                await api.enviarFotoPerfil(formData);
                if (fotoPerfilSelecionada.url) URL.revokeObjectURL(fotoPerfilSelecionada.url);
                fotoPerfilSelecionada = null;
                renderizarPreviewFotoPerfil();
            }

            alert('Perfil atualizado com sucesso!');
            fecharModal(modalPerfil);
            carregarFeed();
        } catch (err) {
            mostrarErro(perfilErro, err.message);
        }
    });

    selectUpgradeTipo.addEventListener('change', () => {
        const tipo = selectUpgradeTipo.value;
        upgradeCamposDev.hidden = tipo !== 'Dev';
        upgradeCamposRecrutador.hidden = tipo !== 'Recrutador';
    });

    formUpgrade.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErro(upgradeErro);
        const tipoSolicitado = selectUpgradeTipo.value;
        const payload = {
            TipoDesejado: tipoSolicitado,
            bio: tipoSolicitado === 'Dev' ? $('upgrade-bio').value.trim() : null,
            linkGitHub: tipoSolicitado === 'Dev' ? $('upgrade-github').value.trim() : null,
            cnpjEmpresa: tipoSolicitado === 'Recrutador' ? $('upgrade-cnpj').value.trim() : null,
            linkLinkedIn: tipoSolicitado === 'Recrutador' ? $('upgrade-linkedin').value.trim() : null
        };

        try {
            const response = await fetch(`${API_HOST}/api/usuarios/solicitar-upgrade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...api.getAuthHeader() },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error('Falha ao solicitar upgrade.');
            alert('Solicitação enviada com sucesso!');
            formUpgrade.reset();
            fecharModal(modalUpgrade);
        } catch (err) {
            mostrarErro(upgradeErro, err.message);
        }
    });

    formPublicar.addEventListener('submit', async (e) => {
        e.preventDefault();
        limparErro(publicarErro);

        const formData = new FormData();
        formData.append('Titulo', $('publicar-titulo').value.trim());
        formData.append('Descricao', $('publicar-descricao').value.trim());
        formData.append('LinkRepositorio', $('publicar-link').value.trim());

        fotosProjetoSelecionadas.slice(0, 5).forEach((item, idx) => {
            formData.append('Fotos', item.file, item.file.name || `foto-${idx + 1}.jpg`);
        });

        if (videoProjetoSelecionado?.file) {
            formData.append('Video', videoProjetoSelecionado.file, videoProjetoSelecionado.name);
        }

        try {
            await api.publicarProjetoMultipart(formData);
            alert('Projeto enviado para moderação com sucesso!');
            formPublicar.reset();
            limparMidiasFormularioPublicar();
            fecharModal(modalPublicar);
            carregarFeed();
        } catch (err) {
            mostrarErro(publicarErro, err.message);
        }
    });

    // =========================================================================
    // MODAL "MEUS PROJETOS" PARA DEVS
    // =========================================================================
    async function carregarMeusProjetos() {
        if (!listaMeusProjetos) return;
        listaMeusProjetos.innerHTML = '<p>Carregando seus projetos...</p>';

        try {
            const response = await fetch(`${API_HOST}/api/projetos/meus-projetos`, {
                headers: api.getAuthHeader()
            });
            const data = await response.json().catch(() => ([]));
            if (!response.ok) throw new Error(data.mensagem || 'Erro ao carregar seus projetos.');

            const projetos = Array.isArray(data) ? data : (data.projetos || []);
            listaMeusProjetos.innerHTML = '';

            if (projetos.length === 0) {
                listaMeusProjetos.innerHTML = '<p style="color: var(--text-secondary);">Você ainda não publicou nenhum projeto.</p>';
                return;
            }

            projetos.forEach(p => {
                const card = document.createElement('div');
                card.className = 'admin-card-item';

                const recusado = !!p.recusadoPeloAdmin || String(p.status).toLowerCase() === 'recusado';
                const aprovado = !recusado && (!!p.aprovadoPeloAdmin || String(p.status).toLowerCase() === 'aprovado');

                const statusTexto = recusado ? 'Recusado' : (aprovado ? 'Aprovado' : 'Pendente');
                const statusClasse = recusado ? 'status-recusado' : (aprovado ? 'status-aprovado' : 'status-pendente');

                const header = document.createElement('div');
                header.className = 'admin-card-header';
                header.style.gap = '10px';
                header.style.flexWrap = 'wrap';

                const tituloBox = document.createElement('div');
                tituloBox.style.display = 'flex';
                tituloBox.style.alignItems = 'center';
                tituloBox.style.gap = '8px';
                tituloBox.style.flexWrap = 'wrap';

                const h4 = document.createElement('h4');
                h4.textContent = p.titulo;

                const badge = document.createElement('span');
                badge.className = `status-badge ${statusClasse}`;
                badge.textContent = statusTexto;

                tituloBox.appendChild(h4);
                tituloBox.appendChild(badge);

                const btnExcluir = document.createElement('button');
                btnExcluir.type = 'button';
                btnExcluir.className = 'btn-deletar';
                btnExcluir.textContent = '🗑 Excluir';
                btnExcluir.addEventListener('click', async () => {
                    if (!confirm(`Deseja excluir o projeto "${p.titulo}"?`)) return;
                    try {
                        await api.deletarProjeto(p.id);
                        await carregarMeusProjetos();
                        carregarFeed();
                    } catch (err) {
                        alert(err.message);
                    }
                });

                header.appendChild(tituloBox);
                header.appendChild(btnExcluir);
                card.appendChild(header);

                const desc = document.createElement('p');
                desc.style.color = 'var(--text-secondary)';
                desc.style.fontSize = '0.9rem';
                desc.textContent = p.descricao;
                card.appendChild(desc);

                if (recusado && p.motivoRecusa) {
                    const motivoBox = document.createElement('div');
                    motivoBox.className = 'motivo-recusa-box';
                    motivoBox.textContent = `Motivo da recusa: ${p.motivoRecusa}`;
                    card.appendChild(motivoBox);
                }

                listaMeusProjetos.appendChild(card);
            });
        } catch (err) {
            listaMeusProjetos.innerHTML = `<p class="form-erro">${err.message}</p>`;
        }
    }

    // =========================================================================
    // CHAT DIRETO (RECRUTADOR, DEV E ADMIN)
    // =========================================================================
    function formatarHoraChat(dataStr) {
        if (!dataStr) return '';
        const dt = new Date(dataStr);
        if (Number.isNaN(dt.getTime())) return '';
        return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }

    function renderizarContatosChat() {
        const termo = (chatBuscaContato?.value || '').trim().toLowerCase();

        const filtrar = (lista) => lista.filter(item => {
            if (!termo) return true;
            const nome = (item.nome || item.Nome || '').toLowerCase();
            const perfil = (item.tipoPerfil || item.TipoPerfil || '').toLowerCase();
            return nome.includes(termo) || perfil.includes(termo);
        });

        if (chatListaConversas) {
            chatListaConversas.innerHTML = '';
            const recentes = filtrar(chatConversasCache);
            if (recentes.length === 0) {
                chatListaConversas.innerHTML = '<p class="chat-vazio">Sem conversas recentes.</p>';
            } else {
                recentes.forEach(c => {
                    const idContato = c.usuarioId ?? c.UsuarioId ?? c.id ?? c.Id;
                    const nomeContato = c.nome ?? c.Nome ?? 'Usuário';
                    const perfilContato = c.tipoPerfil ?? c.TipoPerfil ?? '';
                    const ultimaMsg = c.ultimaMensagem ?? c.UltimaMensagem ?? '';

                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = `chat-contato-item ${String(chatContatoAtivo?.id) === String(idContato) ? 'ativo' : ''}`;

                    const spanNome = document.createElement('span');
                    spanNome.className = 'chat-contato-nome';
                    spanNome.textContent = nomeContato;

                    const spanPerfil = document.createElement('span');
                    spanPerfil.className = 'chat-contato-perfil';
                    spanPerfil.textContent = perfilContato;

                    const spanPreview = document.createElement('span');
                    spanPreview.className = 'chat-contato-preview';
                    spanPreview.textContent = ultimaMsg;

                    btn.appendChild(spanNome);
                    btn.appendChild(spanPerfil);
                    btn.appendChild(spanPreview);

                    btn.addEventListener('click', () => selecionarContatoChat({
                        id: idContato,
                        nome: nomeContato,
                        tipoPerfil: perfilContato
                    }));
                    chatListaConversas.appendChild(btn);
                });
            }
        }

        if (chatListaContatos) {
            chatListaContatos.innerHTML = '';
            const elegiveis = filtrar(chatContatosCache);
            if (elegiveis.length === 0) {
                chatListaContatos.innerHTML = '<p class="chat-vazio">Nenhum contato elegível.</p>';
            } else {
                elegiveis.forEach(u => {
                    const idContato = u.id ?? u.Id ?? u.usuarioId ?? u.UsuarioId;
                    const nomeContato = u.nome ?? u.Nome ?? 'Usuário';
                    const perfilContato = u.tipoPerfil ?? u.TipoPerfil ?? '';

                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = `chat-contato-item ${String(chatContatoAtivo?.id) === String(idContato) ? 'ativo' : ''}`;

                    const spanNome = document.createElement('span');
                    spanNome.className = 'chat-contato-nome';
                    spanNome.textContent = nomeContato;

                    const spanPerfil = document.createElement('span');
                    spanPerfil.className = 'chat-contato-perfil';
                    spanPerfil.textContent = perfilContato;

                    btn.appendChild(spanNome);
                    btn.appendChild(spanPerfil);

                    btn.addEventListener('click', () => selecionarContatoChat({
                        id: idContato,
                        nome: nomeContato,
                        tipoPerfil: perfilContato
                    }));
                    chatListaContatos.appendChild(btn);
                });
            }
        }
    }

    async function selecionarContatoChat(contato) {
        if (!contato || !contato.id) return;
        chatContatoAtivo = contato;
        renderizarContatosChat();

        if (chatHeaderAtivo) {
            chatHeaderAtivo.textContent = `${contato.nome} (${contato.tipoPerfil || 'Usuário'})`;
        }
        if (formEnviarMensagem) {
            formEnviarMensagem.hidden = false;
        }
        if (chatMensagensLista) {
            chatMensagensLista.innerHTML = '<p class="chat-vazio">Carregando mensagens...</p>';
        }

        try {
            const historico = await api.getHistoricoMensagens(contato.id);
            const meuId = obterMeuId();
            chatMensagensLista.innerHTML = '';

            if (!Array.isArray(historico) || historico.length === 0) {
                chatMensagensLista.innerHTML = '<p class="chat-vazio">Nenhuma mensagem ainda. Envie a primeira!</p>';
                return;
            }

            historico.forEach(msg => {
                const remetenteId = msg.remetenteId ?? msg.RemetenteId;
                const conteudoTexto = msg.conteudo ?? msg.Conteudo ?? '';
                const dataEnvio = msg.dataEnvio ?? msg.DataEnvio;

                const enviadaPorMim = meuId !== null && String(remetenteId) === String(meuId);
                const bolha = document.createElement('div');
                bolha.className = `chat-mensagem-bolha ${enviadaPorMim ? 'chat-mensagem-minha' : 'chat-mensagem-outra'}`;

                const texto = document.createElement('div');
                texto.textContent = conteudoTexto;

                const hora = document.createElement('span');
                hora.className = 'chat-mensagem-hora';
                hora.textContent = formatarHoraChat(dataEnvio);

                bolha.appendChild(texto);
                bolha.appendChild(hora);
                chatMensagensLista.appendChild(bolha);
            });

            chatMensagensLista.scrollTop = chatMensagensLista.scrollHeight;
        } catch (err) {
            if (chatMensagensLista) {
                chatMensagensLista.innerHTML = `<p class="form-erro">${err.message}</p>`;
            }
        }
    }

    async function carregarChatInicial() {
        if (chatListaContatos) {
            chatListaContatos.innerHTML = '<p class="chat-vazio">Carregando contatos...</p>';
        }
        try {
            const [conversas, contatos] = await Promise.all([
                api.getConversasMensagens(),
                api.getContatosMensagens()
            ]);

            chatConversasCache = Array.isArray(conversas) ? conversas : [];
            chatContatosCache = Array.isArray(contatos) ? contatos : [];
            renderizarContatosChat();

            if (!chatContatoAtivo && chatConversasCache.length > 0) {
                const primeira = chatConversasCache[0];
                await selecionarContatoChat({
                    id: primeira.usuarioId ?? primeira.UsuarioId ?? primeira.id ?? primeira.Id,
                    nome: primeira.nome ?? primeira.Nome ?? 'Usuário',
                    tipoPerfil: primeira.tipoPerfil ?? primeira.TipoPerfil ?? ''
                });
            }
        } catch (err) {
            if (chatListaContatos) {
                chatListaContatos.innerHTML = `<p class="form-erro">${err.message || 'Erro ao carregar contatos.'}</p>`;
            }
        }
    }

    if (chatBuscaContato) {
        chatBuscaContato.addEventListener('input', renderizarContatosChat);
    }

    if (formEnviarMensagem) {
        formEnviarMensagem.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!chatContatoAtivo || !chatInputMensagem) return;
            const conteudo = chatInputMensagem.value.trim();
            if (!conteudo) return;

            try {
                await api.enviarMensagemDireta(chatContatoAtivo.id, conteudo);
                chatInputMensagem.value = '';
                await selecionarContatoChat(chatContatoAtivo);
                const conversasAtualizadas = await api.getConversasMensagens().catch(() => null);
                if (Array.isArray(conversasAtualizadas)) {
                    chatConversasCache = conversasAtualizadas;
                    renderizarContatosChat();
                }
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // Gestão de abas do Painel Admin
    btnTabUpgrades.addEventListener('click', () => {
        btnTabUpgrades.classList.add('ativo');
        btnTabProjetos.classList.remove('ativo');
        btnTabUsuarios.classList.remove('ativo');
        abaUpgrades.hidden = false;
        abaProjetos.hidden = true;
        abaUsuarios.hidden = true;
    });

    btnTabProjetos.addEventListener('click', () => {
        btnTabProjetos.classList.add('ativo');
        btnTabUpgrades.classList.remove('ativo');
        btnTabUsuarios.classList.remove('ativo');
        abaProjetos.hidden = false;
        abaUpgrades.hidden = true;
        abaUsuarios.hidden = true;
    });

    if (btnTabUsuarios) {
        btnTabUsuarios.addEventListener('click', () => {
            btnTabUsuarios.classList.add('ativo');
            btnTabUpgrades.classList.remove('ativo');
            btnTabProjetos.classList.remove('ativo');
            abaUsuarios.hidden = false;
            abaUpgrades.hidden = true;
            abaProjetos.hidden = true;
            carregarUsuariosAdmin();
        });
    }

    async function carregarPainelAdmin() {
        await Promise.all([carregarUpgradesPendentes(), carregarProjetosPendentes(), carregarUsuariosAdmin()]);
    }

    function construirCarrosselElemento(mídias, altTitulo = 'Mídia do projeto') {
        const wrapper = document.createElement('div');
        wrapper.className = 'carousel-container';

        const track = document.createElement('div');
        track.className = 'carousel-track';

        const btnPrev = document.createElement('button');
        btnPrev.type = 'button';
        btnPrev.className = 'carousel-btn carousel-btn-prev';
        btnPrev.innerHTML = '&#10094;';

        const btnNext = document.createElement('button');
        btnNext.type = 'button';
        btnNext.className = 'carousel-btn carousel-btn-next';
        btnNext.innerHTML = '&#10095;';

        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'carousel-dots';

        mídias.forEach((m, index) => {
            const urlResolvida = resolverUrl(m.url);
            if (!urlResolvida) return;

            const slide = document.createElement('div');
            slide.className = 'carousel-slide';

            if (m.tipo === 'img') {
                const img = document.createElement('img');
                img.src = urlResolvida;
                img.alt = altTitulo;
                img.addEventListener('click', () => {
                    lightboxImg.src = urlResolvida;
                    abrirModal(lightboxModal);
                });
                slide.appendChild(img);
            } else {
                const video = document.createElement('video');
                video.src = urlResolvida;
                video.controls = true;
                slide.appendChild(video);
            }
            track.appendChild(slide);

            const dot = document.createElement('div');
            dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                currentIndex = index;
                atualizarCarrossel();
            });
            dotsContainer.appendChild(dot);
        });

        let currentIndex = 0;
        const totalSlides = track.children.length;

        function atualizarCarrossel() {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            Array.from(dotsContainer.children).forEach((dot, idx) => {
                dot.classList.toggle('active', idx === currentIndex);
            });
            btnPrev.style.display = totalSlides > 1 && currentIndex > 0 ? 'block' : 'none';
            btnNext.style.display = totalSlides > 1 && currentIndex < totalSlides - 1 ? 'block' : 'none';
        }

        if (totalSlides <= 1) {
            btnPrev.style.display = 'none';
            btnNext.style.display = 'none';
            dotsContainer.style.display = 'none';
        } else {
            btnPrev.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    atualizarCarrossel();
                }
            });
            btnNext.addEventListener('click', () => {
                if (currentIndex < totalSlides - 1) {
                    currentIndex++;
                    atualizarCarrossel();
                }
            });
            atualizarCarrossel();
        }

        wrapper.appendChild(track);
        wrapper.appendChild(btnPrev);
        wrapper.appendChild(btnNext);
        wrapper.appendChild(dotsContainer);
        return wrapper;
    }

    async function carregarUpgradesPendentes() {
        if (!listaUpgradesPendentes) return;
        listaUpgradesPendentes.innerHTML = '<p>Carregando...</p>';
        try {
            const response = await fetch(`${API_HOST}/api/usuarios/pendentes-upgrade`, { headers: api.getAuthHeader() });
            const usuarios = await response.json();
            listaUpgradesPendentes.innerHTML = '';
            if (!usuarios || usuarios.length === 0) {
                listaUpgradesPendentes.innerHTML = '<p>Nenhuma solicitação de upgrade pendente.</p>';
                return;
            }
            usuarios.forEach(u => {
                const tipoDesejado = u.tipoDesejado || u.tipoSolicitado || 'Dev';
                const card = document.createElement('div');
                card.className = 'admin-card-item';

                const header = document.createElement('div');
                header.className = 'admin-card-header';
                header.style.alignItems = 'flex-start';
                header.style.gap = '12px';

                const infoBox = document.createElement('div');
                infoBox.style.flex = '1';

                const h4 = document.createElement('h4');
                h4.textContent = `${u.nome} (${u.email})`;
                infoBox.appendChild(h4);

                const detalhes = document.createElement('div');
                detalhes.style.fontSize = '0.85rem';
                detalhes.style.color = 'var(--text-secondary)';
                detalhes.style.marginTop = '4px';
                detalhes.innerHTML = `
                    <div><strong>Nome:</strong> ${u.nome || '-'}</div>
                    <div><strong>E-mail:</strong> ${u.email || '-'}</div>
                    <div><strong>Tipo Desejado:</strong> ${tipoDesejado}</div>
                    <div><strong>Bio:</strong> ${u.bio || 'Não informada'}</div>
                    <div><strong>GitHub:</strong> ${u.linkGitHub || 'Não informado'}</div>
                    <div><strong>CNPJ:</strong> ${u.cnpjEmpresa || 'Não informado'}</div>
                    <div><strong>LinkedIn:</strong> ${u.linkLinkedIn || 'Não informado'}</div>
                `;
                infoBox.appendChild(detalhes);

                const acoesBox = document.createElement('div');
                acoesBox.style.display = 'flex';
                acoesBox.style.gap = '8px';
                acoesBox.style.flexShrink = '0';

                const btnAprovar = document.createElement('button');
                btnAprovar.className = 'btn-primary';
                btnAprovar.textContent = 'Aprovar';

                const btnRecusar = document.createElement('button');
                btnRecusar.className = 'btn-deletar';
                btnRecusar.textContent = 'Recusar';

                acoesBox.appendChild(btnAprovar);
                acoesBox.appendChild(btnRecusar);

                header.appendChild(infoBox);
                header.appendChild(acoesBox);
                card.appendChild(header);

                btnAprovar.addEventListener('click', async () => {
                    await fetch(`${API_HOST}/api/usuarios/${u.id}/aprovar-upgrade`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...api.getAuthHeader() },
                        body: JSON.stringify({ novoTipo: tipoDesejado })
                    });
                    carregarUpgradesPendentes();
                    carregarUsuariosAdmin();
                });

                btnRecusar.addEventListener('click', () => {
                    abrirModalRecusa({
                        titulo: 'Recusar Solicitação de Upgrade',
                        subtitulo: `Usuário: ${u.nome} (${u.email}) — Tipo desejado: ${tipoDesejado}`,
                        onConfirmar: async (motivo) => {
                            const res = await fetch(`${API_HOST}/api/usuarios/${u.id}/rejeitar-upgrade`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...api.getAuthHeader() },
                                body: JSON.stringify({ motivo })
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.mensagem || 'Erro ao recusar upgrade.');
                            carregarUpgradesPendentes();
                            carregarUsuariosAdmin();
                        }
                    });
                });

                listaUpgradesPendentes.appendChild(card);
            });
        } catch (err) {
            listaUpgradesPendentes.innerHTML = '<p>Erro ao carregar solicitações.</p>';
        }
    }

    async function carregarProjetosPendentes() {
        if (!listaProjetosPendentes) return;
        listaProjetosPendentes.innerHTML = '<p>Carregando...</p>';
        try {
            const response = await fetch(`${API_HOST}/api/projetos/pendentes-aprovacao`, { headers: api.getAuthHeader() });
            const projetos = await response.json();
            listaProjetosPendentes.innerHTML = '';
            if (!projetos || projetos.length === 0) {
                listaProjetosPendentes.innerHTML = '<p>Nenhum projeto pendente de moderação.</p>';
                return;
            }
            projetos.forEach(p => {
                const card = document.createElement('div');
                card.className = 'admin-card-item';

                const header = document.createElement('div');
                header.className = 'admin-card-header';
                const blocoTitulo = document.createElement('div');
                const titulo = document.createElement('h4');
                titulo.textContent = p.titulo;
                const autor = document.createElement('small');
                autor.textContent = `Autor: ${p.autor}`;
                blocoTitulo.appendChild(titulo);
                blocoTitulo.appendChild(autor);

                const acoesBox = document.createElement('div');
                acoesBox.style.display = 'flex';
                acoesBox.style.gap = '8px';

                const btnAprovar = document.createElement('button');
                btnAprovar.className = 'btn-primary';
                btnAprovar.textContent = 'Aprovar';

                const btnRecusar = document.createElement('button');
                btnRecusar.className = 'btn-deletar';
                btnRecusar.textContent = 'Recusar';

                acoesBox.appendChild(btnAprovar);
                acoesBox.appendChild(btnRecusar);

                header.appendChild(blocoTitulo);
                header.appendChild(acoesBox);
                card.appendChild(header);

                const descricao = document.createElement('p');
                descricao.textContent = p.descricao;
                card.appendChild(descricao);

                if (p.linkRepositorio) {
                    const linkRepo = document.createElement('a');
                    linkRepo.href = p.linkRepositorio;
                    linkRepo.target = '_blank';
                    linkRepo.rel = 'noopener';
                    linkRepo.className = 'btn-link';
                    linkRepo.textContent = p.linkRepositorio;
                    card.appendChild(linkRepo);
                }

                const fotosPendentes = [];
                if (p.fotos && p.fotos.length > 0) {
                    p.fotos.forEach(f => fotosPendentes.push({ tipo: 'img', url: f }));
                } else if (p.fotoUrl) {
                    fotosPendentes.push({ tipo: 'img', url: p.fotoUrl });
                }

                if (fotosPendentes.length > 0) {
                    card.appendChild(construirCarrosselElemento(fotosPendentes, p.titulo));
                }

                const videoResolvido = resolverUrl(p.videoUrl);
                if (videoResolvido) {
                    const video = document.createElement('video');
                    video.className = 'post-midia';
                    video.controls = true;
                    video.src = videoResolvido;
                    card.appendChild(video);
                }

                btnAprovar.addEventListener('click', async () => {
                    await fetch(`${API_HOST}/api/projetos/${p.id}/aprovar-projeto`, { method: 'POST', headers: api.getAuthHeader() });
                    carregarProjetosPendentes();
                    carregarFeed();
                });

                btnRecusar.addEventListener('click', () => {
                    abrirModalRecusa({
                        titulo: 'Recusar Projeto Pendente',
                        subtitulo: `Projeto: "${p.titulo}" — Autor: ${p.autor}`,
                        onConfirmar: async (motivo) => {
                            const res = await fetch(`${API_HOST}/api/projetos/${p.id}/rejeitar-projeto`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', ...api.getAuthHeader() },
                                body: JSON.stringify({ motivo })
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.mensagem || 'Erro ao recusar projeto.');
                            carregarProjetosPendentes();
                        }
                    });
                });

                listaProjetosPendentes.appendChild(card);
            });
        } catch (err) {
            listaProjetosPendentes.innerHTML = '<p>Erro ao carregar projetos pendentes.</p>';
        }
    }

    async function carregarUsuariosAdmin() {
        if (!listaUsuariosTodos) return;
        listaUsuariosTodos.innerHTML = '<p>Carregando...</p>';
        try {
            const response = await fetch(`${API_HOST}/api/usuarios/todos`, { headers: api.getAuthHeader() });
            const usuarios = await response.json();
            listaUsuariosTodos.innerHTML = '';
            if (!usuarios || usuarios.length === 0) {
                listaUsuariosTodos.innerHTML = '<p>Nenhum usuário cadastrado.</p>';
                return;
            }
            usuarios.forEach(u => {
                const card = document.createElement('div');
                card.className = 'admin-card-item';
                const dataFormatada = new Date(u.dataCadastro).toLocaleDateString('pt-BR');
                card.innerHTML = `
                    <div class="admin-card-header">
                        <div>
                            <h4>${u.nome}</h4>
                            <small>E-mail: ${u.email} | Tipo: <strong>${u.TipoPerfil || u.tipoPerfil}</strong> | Cadastro: ${dataFormatada}</small>
                        </div>
                    </div>`;
                listaUsuariosTodos.appendChild(card);
            });
        } catch (err) {
            listaUsuariosTodos.innerHTML = '<p>Erro ao carregar listagem de usuários.</p>';
        }
    }

    async function carregarFavoritos() {
        try {
            const favoritos = await api.getFavoritos();
            feed.innerHTML = '<h2>Meus Projetos Favoritos (Talent Pool)</h2>';
            if (!favoritos || favoritos.length === 0) {
                feed.innerHTML += '<p>Nenhum projeto favoritado.</p>';
                return;
            }
            favoritos.forEach(fav => {
                const p = fav.projeto;
                const div = document.createElement('div');
                div.className = 'projeto-card';

                const header = document.createElement('div');
                header.className = 'projeto-card-header';

                const h3 = document.createElement('h3');
                h3.className = 'projeto-titulo';
                h3.style.color = '#614DE6';
                h3.textContent = p.titulo;

                const autorBox = document.createElement('div');
                autorBox.className = 'projeto-autor-box';

                const avatar = document.createElement('img');
                avatar.className = 'autor-avatar';
                avatar.src = fotoPerfilOuPadrao(p.autorFotoPerfilUrl);
                avatar.alt = p.autor || 'Desenvolvedor';

                const autorLink = document.createElement('a');
                autorLink.href = '#';
                autorLink.className = 'projeto-autor';
                autorLink.textContent = p.autor || 'Anônimo';
                autorLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    abrirPerfilDev(p.devId);
                });

                autorBox.appendChild(avatar);
                autorBox.appendChild(autorLink);
                header.appendChild(h3);
                header.appendChild(autorBox);
                div.appendChild(header);

                const desc = document.createElement('p');
                desc.className = 'projeto-descricao';
                desc.textContent = p.descricao;
                div.appendChild(desc);

                const midiasFav = [];
                if (p.fotos && p.fotos.length > 0) {
                    p.fotos.forEach(f => midiasFav.push({ tipo: 'img', url: f }));
                } else if (p.fotoUrl) {
                    midiasFav.push({ tipo: 'img', url: p.fotoUrl });
                }
                if (p.videoUrl) {
                    midiasFav.push({ tipo: 'video', url: p.videoUrl });
                }

                if (midiasFav.length > 0) {
                    const midiaWrap = document.createElement('div');
                    midiaWrap.className = 'projeto-midia-container';
                    midiaWrap.appendChild(construirCarrosselElemento(midiasFav, p.titulo));
                    div.appendChild(midiaWrap);
                }

                const footer = document.createElement('div');
                footer.className = 'projeto-footer';

                if (p.devId) {
                    const btnPerfilDev = document.createElement('button');
                    btnPerfilDev.type = 'button';
                    btnPerfilDev.className = 'btn-primary';
                    btnPerfilDev.textContent = `Ver Perfil de ${p.autor || 'Dev'}`;
                    btnPerfilDev.addEventListener('click', () => abrirPerfilDev(p.devId));
                    footer.appendChild(btnPerfilDev);
                }

                if (urlSegura(p.linkRepositorio)) {
                    const linkRepo = document.createElement('a');
                    linkRepo.href = p.linkRepositorio;
                    linkRepo.target = '_blank';
                    linkRepo.rel = 'noopener';
                    linkRepo.className = 'btn-link';
                    linkRepo.textContent = 'Ver Repositório';
                    footer.appendChild(linkRepo);
                }

                const btnRemover = document.createElement('button');
                btnRemover.type = 'button';
                btnRemover.className = 'btn-deletar btn-remover-fav';
                btnRemover.dataset.id = p.id;
                btnRemover.textContent = '★ Remover dos Favoritos';
                btnRemover.addEventListener('click', async () => {
                    await api.desfavoritarProjeto(p.id);
                    carregarFavoritos();
                });
                footer.appendChild(btnRemover);

                div.appendChild(footer);
                feed.appendChild(div);
            });
        } catch (err) {
            alert(err.message);
        }
    }

    async function abrirPerfilDev(devId) {
        if (!devId) return;
        try {
            const dev = await api.obterPerfilPublico(devId);

            $('perfil-dev-foto').src = fotoPerfilOuPadrao(dev.fotoPerfilUrl);
            $('perfil-dev-nome').textContent = dev.nome;
            $('perfil-dev-bio').textContent = dev.bio && dev.bio.trim() !== '' ? dev.bio : 'Este desenvolvedor ainda não escreveu uma bio.';

            const linkGitHub = $('perfil-dev-github');
            if (urlSegura(dev.linkGitHub)) {
                linkGitHub.href = dev.linkGitHub;
                linkGitHub.textContent = dev.linkGitHub;
                linkGitHub.hidden = false;
            } else {
                linkGitHub.hidden = true;
            }

            const listaProjetos = $('perfil-dev-projetos');
            listaProjetos.innerHTML = '';

            if (!dev.projetos || dev.projetos.length === 0) {
                const vazio = document.createElement('p');
                vazio.textContent = 'Nenhum projeto aprovado publicado.';
                listaProjetos.appendChild(vazio);
            } else {
                dev.projetos.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'perfil-dev-projeto';

                    const titulo = document.createElement('h4');
                    titulo.textContent = p.titulo;
                    item.appendChild(titulo);

                    const descricao = document.createElement('p');
                    descricao.textContent = p.descricao;
                    item.appendChild(descricao);

                    const rodape = document.createElement('div');
                    rodape.className = 'perfil-dev-projeto-rodape';

                    const votos = document.createElement('span');
                    votos.textContent = `▲ ${p.totalVotos}`;
                    rodape.appendChild(votos);

                    if (urlSegura(p.linkRepositorio)) {
                        const linkRepo = document.createElement('a');
                        linkRepo.href = p.linkRepositorio;
                        linkRepo.target = '_blank';
                        linkRepo.rel = 'noopener';
                        linkRepo.className = 'btn-link';
                        linkRepo.textContent = 'Ver Repositório';
                        rodape.appendChild(linkRepo);
                    }

                    item.appendChild(rodape);
                    listaProjetos.appendChild(item);
                });
            }

            abrirModal(modalPerfilDev);
        } catch (err) {
            alert(err.message);
        }
    }

    async function carregarComentarios(projetoId, lista) {
        const logado = !!localStorage.getItem('jwt_token');
        const perfil = obterPerfil();
        const meuId = obterMeuId();

        lista.innerHTML = '';
        try {
            const comentarios = await api.getComentarios(projetoId);

            if (!Array.isArray(comentarios) || comentarios.length === 0) {
                const vazio = document.createElement('li');
                vazio.textContent = 'Nenhum comentário ainda.';
                lista.appendChild(vazio);
                return;
            }

            comentarios.forEach(c => {
                const li = document.createElement('li');
                li.className = 'comentario-item';

                const autorNome = c.usuarioNome ?? c.UsuarioNome ?? 'Usuário';
                const perfilTipo = c.perfilTipo ?? c.PerfilTipo ?? 'Espectador';
                const textoComentario = c.textoComentario ?? c.TextoComentario ?? '';
                const autorId = c.autorId ?? c.AutorId ?? '';
                const comentarioId = c.id ?? c.Id ?? '';

                const texto = document.createElement('span');
                texto.textContent = `${autorNome} (${perfilTipo}): ${textoComentario} `;
                li.appendChild(texto);

                const ehAutor = logado && meuId !== null && String(autorId) === String(meuId);
                const ehAdmin = logado && perfil === 'Administrador';

                if ((ehAutor || ehAdmin) && comentarioId) {
                    const btnExcluir = document.createElement('button');
                    btnExcluir.type = 'button';
                    btnExcluir.className = 'btn-deletar';
                    btnExcluir.style.padding = '2px 8px';
                    btnExcluir.style.fontSize = '0.75rem';
                    btnExcluir.style.marginLeft = '8px';
                    btnExcluir.textContent = 'Excluir';
                    btnExcluir.addEventListener('click', async () => {
                        if (!confirm('Excluir este comentário?')) return;
                        try {
                            const response = await fetch(`${API_HOST}/api/projetos/${projetoId}/comentarios/${comentarioId}`, {
                                method: 'DELETE',
                                headers: api.getAuthHeader()
                            });
                            if (!response.ok) {
                                const errData = await response.json().catch(() => ({}));
                                throw new Error(errData.mensagem || 'Não foi possível excluir o comentário.');
                            }
                            await carregarComentarios(projetoId, lista);
                        } catch (err) {
                            alert(err.message);
                        }
                    });
                    li.appendChild(btnExcluir);
                }

                lista.appendChild(li);
            });
        } catch (err) {
            const erro = document.createElement('li');
            erro.textContent = 'Erro ao carregar comentários.';
            lista.appendChild(erro);
        }
    }

    function renderizarProjetos(projetos) {
        feed.innerHTML = '';
        if (!projetos || projetos.length === 0) {
            feed.innerHTML = '<p>Nenhum projeto encontrado.</p>';
            return;
        }

        const logado = !!localStorage.getItem('jwt_token');
        const perfil = obterPerfil();
        const meuId = obterMeuId();

        projetos.forEach(projeto => {
            const card = template.content.cloneNode(true);
            card.querySelector('.projeto-titulo').textContent = projeto.titulo;

            card.querySelector('.autor-avatar').src = fotoPerfilOuPadrao(projeto.autorFotoPerfilUrl);
            const autorEl = card.querySelector('.projeto-autor');
            autorEl.textContent = `@${projeto.autor}`;
            autorEl.addEventListener('click', (e) => {
                e.preventDefault();
                abrirPerfilDev(projeto.devId);
            });
            card.querySelector('.projeto-descricao').textContent = projeto.descricao;

            const mídias = [];
            if (projeto.fotos && projeto.fotos.length > 0) {
                projeto.fotos.forEach(f => mídias.push({ tipo: 'img', url: f }));
            } else if (projeto.fotoUrl) {
                mídias.push({ tipo: 'img', url: projeto.fotoUrl });
            }
            if (projeto.videoUrl) {
                mídias.push({ tipo: 'video', url: projeto.videoUrl });
            }

            const carouselContainer = card.querySelector('.carousel-container');

            if (mídias.length > 0) {
                carouselContainer.hidden = false;
                const track = carouselContainer.querySelector('.carousel-track');
                const dotsContainer = carouselContainer.querySelector('.carousel-dots');
                const btnPrev = carouselContainer.querySelector('.carousel-btn-prev');
                const btnNext = carouselContainer.querySelector('.carousel-btn-next');

                track.innerHTML = '';
                dotsContainer.innerHTML = '';

                mídias.forEach((m, index) => {
                    const urlResolvida = resolverUrl(m.url);
                    if (!urlResolvida) return;

                    const slide = document.createElement('div');
                    slide.className = 'carousel-slide';

                    if (m.tipo === 'img') {
                        const img = document.createElement('img');
                        img.src = urlResolvida;
                        img.alt = projeto.titulo;
                        img.addEventListener('click', () => {
                            lightboxImg.src = urlResolvida;
                            abrirModal(lightboxModal);
                        });
                        slide.appendChild(img);
                    } else {
                        const video = document.createElement('video');
                        video.src = urlResolvida;
                        video.controls = true;
                        slide.appendChild(video);
                    }
                    track.appendChild(slide);

                    const dot = document.createElement('div');
                    dot.className = `carousel-dot ${index === 0 ? 'active' : ''}`;
                    dot.addEventListener('click', () => {
                        currentIndex = index;
                        atualizarCarrossel();
                    });
                    dotsContainer.appendChild(dot);
                });

                let currentIndex = 0;
                const totalSlides = track.children.length;

                function atualizarCarrossel() {
                    track.style.transform = `translateX(-${currentIndex * 100}%)`;
                    Array.from(dotsContainer.children).forEach((dot, idx) => {
                        dot.classList.toggle('active', idx === currentIndex);
                    });
                    btnPrev.style.display = totalSlides > 1 && currentIndex > 0 ? 'block' : 'none';
                    btnNext.style.display = totalSlides > 1 && currentIndex < totalSlides - 1 ? 'block' : 'none';
                }

                if (totalSlides <= 1) {
                    btnPrev.style.display = 'none';
                    btnNext.style.display = 'none';
                    dotsContainer.style.display = 'none';
                } else {
                    btnPrev.addEventListener('click', () => {
                        if (currentIndex > 0) {
                            currentIndex--;
                            atualizarCarrossel();
                        }
                    });
                    btnNext.addEventListener('click', () => {
                        if (currentIndex < totalSlides - 1) {
                            currentIndex++;
                            atualizarCarrossel();
                        }
                    });
                    atualizarCarrossel();
                }
            } else {
                carouselContainer.hidden = true;
            }

            const boxTec = card.querySelector('.projeto-tecnologias');
            (projeto.tecnologias || []).forEach(tec => {
                const badge = document.createElement('span');
                badge.className = 'tec-badge';
                badge.textContent = tec;
                boxTec.appendChild(badge);
            });

            const btnUpvote = card.querySelector('.btn-upvote');
            const contador = card.querySelector('.upvote-count');
            contador.textContent = projeto.totalVotos;
            btnUpvote.addEventListener('click', async () => {
                try {
                    await api.upvote(projeto.id);
                    contador.textContent = parseInt(contador.textContent, 10) + 1;
                    btnUpvote.classList.add('ativo');
                } catch (err) {
                    alert(err.message);
                }
            });

            const link = card.querySelector('.btn-link');
            if (projeto.linkRepositorio && projeto.linkRepositorio.trim() !== '') {
                link.href = projeto.linkRepositorio;
            } else {
                link.hidden = true;
            }

            const btnFavoritar = card.querySelector('.btn-favoritar');
            if (logado && perfil === 'Recrutador') {
                btnFavoritar.hidden = false;
                btnFavoritar.addEventListener('click', async () => {
                    try {
                        await api.favoritarProjeto(projeto.id);
                        alert('Projeto favoritado com sucesso!');
                    } catch (err) {
                        alert(err.message);
                    }
                });
            }

            const btnDeletar = card.querySelector('.btn-deletar');
            if (logado && (perfil === 'Administrador' || projeto.devId === meuId)) {
                btnDeletar.hidden = false;
                btnDeletar.addEventListener('click', async () => {
                    if (confirm('Tem certeza que deseja excluir esta publicação permanentemente?')) {
                        try {
                            await api.deletarProjeto(projeto.id);
                            carregarFeed();
                        } catch (err) {
                            alert(err.message);
                        }
                    }
                });
            }

            const listaComentarios = card.querySelector('.comentarios-lista');
            carregarComentarios(projeto.id, listaComentarios);

            if (logado) {
                card.querySelector('.form-comentario').hidden = false;
                const inputComentario = card.querySelector('.input-comentario');
                const btnComentar = card.querySelector('.btn-comentar');

                btnComentar.addEventListener('click', async () => {
                    const texto = inputComentario.value.trim();
                    if (!texto) return;
                    try {
                        await api.enviarComentario(projeto.id, { textoComentario: texto });
                        inputComentario.value = '';
                        await carregarComentarios(projeto.id, listaComentarios);
                    } catch (err) {
                        alert(err.message);
                    }
                });
                inputComentario.addEventListener('keypress', async (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        btnComentar.click();
                    }
                });
            }

            feed.appendChild(card);
        });
    }

    async function carregarFeed() {
        const busca = inputBusca.value.trim();
        try {
            const data = await api.getFeed(busca, 1, 10);
            renderizarProjetos(data.projetos);
        } catch (err) {
            feed.innerHTML = '<p>Não foi possível carregar o feed de projetos.</p>';
        }
    }

    if (btnBuscar) btnBuscar.addEventListener('click', () => carregarFeed());
    if (inputBusca) inputBusca.addEventListener('keypress', (e) => { if (e.key === 'Enter') carregarFeed(); });

    (async () => {
        await atualizarNav();
        carregarFeed();
    })();
});