using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevBeDev.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMotivoRecusaStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MotivoRecusa",
                table: "Usuarios",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UpgradeRecusado",
                table: "Usuarios",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MotivoRecusa",
                table: "Projetos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RecusadoPeloAdmin",
                table: "Projetos",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MotivoRecusa",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "UpgradeRecusado",
                table: "Usuarios");

            migrationBuilder.DropColumn(
                name: "MotivoRecusa",
                table: "Projetos");

            migrationBuilder.DropColumn(
                name: "RecusadoPeloAdmin",
                table: "Projetos");
        }
    }
}
