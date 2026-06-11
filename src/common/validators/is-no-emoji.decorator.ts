import {
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

const EMOJI_REGEX =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}]/u;

@ValidatorConstraint({ name: 'isNoEmoji', async: false })
class IsNoEmojiConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (typeof value !== 'string') {
        return false;
        }

        return !EMOJI_REGEX.test(value);
    }

    defaultMessage(args: ValidationArguments): string {
        return `${args.property} não pode conter emojis`;
    } 
}

export function IsNoEmoji(validationOptions?: ValidationOptions): PropertyDecorator {
    return (target: object, propertyName: string | symbol) => {
        registerDecorator({
        target: target.constructor,
        propertyName: propertyName.toString(),
        options: validationOptions,
        constraints: [],
        validator: IsNoEmojiConstraint,
        });
    };
}