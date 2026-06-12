import {
    ValidationArguments,
    ValidationOptions,
    ValidatorConstraint,
    ValidatorConstraintInterface,
    registerDecorator,
} from 'class-validator';

const EMOJI_RANGES: Array<[number, number]> = [
    [0x1f600, 0x1f64f],
    [0x1f300, 0x1f5ff],
    [0x1f680, 0x1f6ff],
    [0x1f700, 0x1f77f],
    [0x1f780, 0x1f7ff],
    [0x1f800, 0x1f8ff],
    [0x1f900, 0x1f9ff],
    [0x1fa00, 0x1fa6f],
    [0x1fa70, 0x1faff],
    [0x2600, 0x26ff],
    [0x2700, 0x27bf],
    [0xfe00, 0xfe0f],
];

const EMOJI_CLASS = EMOJI_RANGES
    .map(([lo, hi]) => `\\u{${lo.toString(16)}}-\\u{${hi.toString(16)}}`)
    .join('');

const EMOJI_REGEX = new RegExp(`[${EMOJI_CLASS}]`, 'u');

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
