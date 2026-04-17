module ShipEasyI18n
  module Rails
    module ViewHelpers
      def i18n_head_tags(profile: nil, chunk: nil)
        safe_join([
          i18n_inline_data(profile: profile, chunk: chunk),
          i18n_script_tag,
        ], "\n")
      end

      def i18n_inline_data(profile: nil, chunk: nil)
        config = ShipEasyI18n.configuration
        label_file = ShipEasyI18n::Rails::LabelFetcher.new.fetch(
          profile: profile || config.profile,
          chunk:   chunk   || config.default_chunk,
        )
        return "".html_safe unless label_file

        json_content = JSON.generate(label_file)
        content_tag(:script, json_content.html_safe, id: "i18n-data", type: "application/json")
      end

      def i18n_script_tag(hide_until_ready: false)
        config = ShipEasyI18n.configuration
        attrs  = {
          src: config.loader_url,
          "data-key":     config.public_key,
          "data-profile": config.profile,
          async: true,
        }
        attrs[:"data-hide-until-ready"] = "true" if hide_until_ready
        tag(:script, attrs)
      end

      def i18n_t(key, variables = {}, profile: nil, chunk: nil)
        config = ShipEasyI18n.configuration
        label_file = ShipEasyI18n::Rails::LabelFetcher.new.fetch(
          profile: profile || config.profile,
          chunk:   chunk   || config.default_chunk,
        )
        return key unless label_file && label_file["strings"]

        value = label_file["strings"][key] || key
        variables.each { |k, v| value = value.gsub("{{#{k}}}", v.to_s) }
        value
      end
    end
  end
end
