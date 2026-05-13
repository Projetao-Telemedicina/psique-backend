import { cpf } from 'cpf-cnpj-validator';
import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';

@ValidatorConstraint({ name: 'isCpf', async: false })
class IsCpfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    return cpf.isValid(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ser um CPF válido`;
  }
}

export function IsCPF(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      constraints: [],
      validator: IsCpfConstraint,
    });
  };
}
