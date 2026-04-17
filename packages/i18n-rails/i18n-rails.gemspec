require_relative "lib/i18n/rails/version"

Gem::Specification.new do |spec|
  spec.name        = "i18n-rails"
  spec.version     = ShipEasyI18n::Rails::VERSION
  spec.summary     = "ShipEasy i18n label injection helpers for Rails"
  spec.description = "Adds i18n_head_tags, i18n_inline_data, i18n_script_tag, and i18n_t view helpers for ShipEasy i18n CDN integration."
  spec.authors     = ["ShipEasy"]
  spec.email       = ["sdk@shipeasy.dev"]
  spec.homepage    = "https://github.com/shipeasy/i18n-rails"
  spec.license     = "MIT"

  spec.required_ruby_version = ">= 2.7.0"
  spec.add_dependency "rails", ">= 6.0"

  spec.files = Dir["lib/**/*.rb", "LICENSE", "README.md"]
  spec.require_paths = ["lib"]
end
