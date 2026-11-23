using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevBeDev.API.Migrations
{
    /// <inheritdoc />
    public partial class ExpansaoAdminMultimidia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AprovadoPeloAdmin",
                table: "Usuarios",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "SolicitouUpgrade",
                table: "Usuarios",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "TipoSolicitado",
                table: "Usuarios",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "AprovadoPeloAdmin",
                table: "Projetos",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "FotoUrl",
                table: "Projetos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoUrl",
                table: "Projetos",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AprovadoPeloAdmin",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "SolicitouUpgrade",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "TipoSolicitado",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "AprovadoPeloAdmin",
                table: "Projetos");

            migrationBuilder.DropColumn(
                name: "FotoUrl",
                table: "Projetos");

            migrationBuilder.DropColumn(
                name: "VideoUrl",
                table: "Projetos");
        }
    }
}
