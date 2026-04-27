import React, { Component, type ComponentType } from "react";
import {
  ShipeasyContext,
  type ShipeasyContextValue,
  type ShipEasyI18nContextValue,
} from "../context";

export function withShipEasyI18n<P extends object>(
  WrappedComponent: ComponentType<P & { i18n: ShipEasyI18nContextValue }>,
) {
  return class WithShipEasyI18n extends Component<P> {
    static contextType = ShipeasyContext;
    declare context: ShipeasyContextValue;
    render() {
      return <WrappedComponent {...this.props} i18n={this.context.i18n} />;
    }
  };
}
