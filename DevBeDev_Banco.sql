CREATE DATABASE DevBeDevDB;
GO
USE DevBeDevDB;
GO

-- Tabela de Usuários (Desenvolvedores)
CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nome NVARCHAR(100) NOT NULL,
    Email NVARCHAR(150) UNIQUE NOT NULL,
    SenhaHash NVARCHAR(256) NOT NULL,
    GitHubUrl NVARCHAR(255),
    Bio NVARCHAR(500),
    Senioridade NVARCHAR(50), -- Ex: Junior, Pleno, Senior
    DataCadastro DATETIME DEFAULT GETDATE()
);

-- Tabela de Projetos do Desenvolvedor
CREATE TABLE Projetos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioId INT NOT NULL,
    Titulo NVARCHAR(150) NOT NULL,
    Descricao NVARCHAR(MAX) NOT NULL,
    Tecnologias NVARCHAR(255), -- Ex: "C#, React, SQL"
    RepositorioUrl NVARCHAR(255),
    DataCriacao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
);

-- Tabela de Conexões (Networking entre Devs)
CREATE TABLE Conexoes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UsuarioSolicitanteId INT NOT NULL,
    UsuarioReceptorId INT NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Pendente', -- Pendente, Aceito, Bloqueado
    DataSolicitacao DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UsuarioSolicitanteId) REFERENCES Usuarios(Id),
    FOREIGN KEY (UsuarioReceptorId) REFERENCES Usuarios(Id)
);