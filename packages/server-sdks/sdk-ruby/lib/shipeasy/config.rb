# Single configuration object for the Shipeasy gem.
#
# Covers both subsystems:
#   - SDK / experimentation (api_key, base_url) — drives FlagsClient
#   - i18n / string manager (public_key, profile, cdn_base_url, ...) — drives
#     the Rails view helpers and label fetcher
#
# Usage:
#
#   Shipeasy.configure do |c|
#     c.api_key    = ENV["SHIPEASY_SERVER_KEY"]
#     c.public_key = ENV["SHIPEASY_CLIENT_KEY"]
#     c.profile    = "default"
#   end
#
# Anything not set falls back to the defaults below. The same Shipeasy.config
# is read by FlagsClient and the Rails helpers, so there is one place to
# point environment variables at.

module Shipeasy
  class Configuration
    # ---- experimentation / SDK ----
    attr_accessor :api_key, :base_url

    # ---- i18n / string manager ----
    attr_accessor :public_key, :profile, :default_chunk,
                  :cdn_base_url, :loader_url,
                  :manifest_cache_ttl, :label_file_cache_ttl, :http_timeout

    def initialize
      @base_url             = "https://edge.shipeasy.dev"

      @profile              = "default"
      @default_chunk        = "index"
      @cdn_base_url         = "https://cdn.i18n.shipeasy.ai"
      @loader_url           = "https://cdn.i18n.shipeasy.ai/loader.js"
      @manifest_cache_ttl   = 60
      @label_file_cache_ttl = 3600
      @http_timeout         = 1
    end
  end

  class << self
    def config
      @config ||= Configuration.new
    end

    def configure
      yield config
    end

    # Reset the config back to defaults — primarily for tests.
    def reset_config!
      @config = nil
    end
  end
end
