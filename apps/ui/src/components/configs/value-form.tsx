"use client";

import Form from "@rjsf/core";
import type { IChangeEvent } from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { JsonSchema } from "@shipeasy/core";

type Props = {
  schema: JsonSchema;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
};

/** Schema-driven value editor. RJSF generates inputs from a flat object schema.
 * Validation runs in the browser via Ajv (Workers-safe validation happens server-side
 * via @cfworker/json-schema in the handler). */
export function ValueForm({ schema, value, onChange, disabled }: Props) {
  return (
    <div className="se-rjsf flex flex-col gap-2">
      <Form
        schema={schema as object}
        formData={value}
        validator={validator}
        disabled={disabled}
        showErrorList={false}
        onChange={(e: IChangeEvent) => onChange(e.formData)}
        liveValidate
        // Hide the default submit button — the parent owns Save/Publish.
        uiSchema={{ "ui:submitButtonOptions": { norender: true } }}
      />
    </div>
  );
}
