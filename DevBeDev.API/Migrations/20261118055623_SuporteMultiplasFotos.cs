using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DevBeDev.API.Migrations
{
    /// <inheritdoc />
    public partial class SuporteMultiplasFotos : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FotosJson",
                table: "Projetos",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FotosJson",
                table: "Projetos");
        }
    }
}
