import type { UseCase } from "../../../../../../src/adapters/inbound/mcp/tools/use-case";

export class SpyUseCase<Input, Output> implements UseCase<Input, Output> {
    readonly inputs: Input[] = [];

    constructor(private readonly output: Output) {}

    async execute(input: Input): Promise<Output> {
        this.inputs.push(input);
        return this.output;
    }
}
