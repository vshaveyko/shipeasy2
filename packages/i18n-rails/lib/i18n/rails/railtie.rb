module ShipEasyI18n
  module Rails
    class Railtie < ::Rails::Railtie
      initializer "i18n.view_helpers" do
        ActiveSupport.on_load(:action_view) do
          include ShipEasyI18n::Rails::ViewHelpers
        end
      end
    end
  end
end
