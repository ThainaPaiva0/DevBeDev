FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["DevBeDev.API.csproj", "./"]
RUN dotnet restore "./DevBeDev.API.csproj"

COPY . .
RUN dotnet build "./DevBeDev.API.csproj" -c Release -o /app/build
RUN dotnet publish "./DevBeDev.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "DevBeDev.API.dll"]