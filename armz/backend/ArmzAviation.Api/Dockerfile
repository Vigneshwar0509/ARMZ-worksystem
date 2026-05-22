# Build stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy project files and restore
COPY ["ArmzAviation.Api.csproj", "./"]
RUN dotnet restore "./ArmzAviation.Api.csproj"

# Copy the rest of the sources and publish
COPY . .
RUN dotnet publish "ArmzAviation.Api.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

COPY --from=build /app/publish ./

# Render commonly expects the service to listen on the port specified in the PORT env var.
# We expose 8080 as a conventional port — Program.cs will bind to the PORT env var at runtime.
EXPOSE 8080

ENV ASPNETCORE_ENVIRONMENT=Production

ENTRYPOINT ["dotnet", "ArmzAviation.Api.dll"]
