module ShipEasyI18n
  class Configuration
    attr_accessor :public_key, :profile, :default_chunk, :cdn_base_url,
                  :loader_url, :manifest_cache_ttl, :label_file_cache_ttl, :http_timeout

    def initialize
      @default_chunk       = "index"
      @cdn_base_url        = "https://cdn.i18n.shipeasy.ai"
      @loader_url          = "https://cdn.i18n.shipeasy.ai/loader.js"
      @manifest_cache_ttl  = 60
      @label_file_cache_ttl = 3600
      @http_timeout        = 1
    end
  end

  class << self
    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield configuration
    end
  end
end
