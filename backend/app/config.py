from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    jwt_secret: str
    frontend_url: str = "http://localhost:3000"
    environment: str = "development"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "axiom-llm"
    ollama_embed_model: str = "nomic-embed-text"
    admin_username: str = "admin"
    admin_password: str = "changeme"
    redis_url: str = ""
    sentry_dsn: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_verify_service_sid: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
