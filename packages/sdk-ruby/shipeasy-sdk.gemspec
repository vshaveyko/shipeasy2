Gem::Specification.new do |spec|
  spec.name        = "shipeasy-sdk"
  spec.version     = "1.0.0"
  spec.summary     = "ShipEasy feature flag and experimentation SDK for Ruby"
  spec.description = "Server SDK for ShipEasy — polls /sdk/flags and /sdk/experiments, evaluates flags and experiments locally."
  spec.authors     = ["ShipEasy"]
  spec.email       = ["sdk@shipeasy.dev"]
  spec.homepage    = "https://github.com/shipeasy/sdk-ruby"
  spec.license     = "MIT"

  spec.required_ruby_version = ">= 2.7.0"

  spec.files = Dir["lib/**/*.rb", "LICENSE", "README.md"]
  spec.require_paths = ["lib"]
end
