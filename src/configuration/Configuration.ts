import { Collection, MongoClient } from 'mongodb';
import * as zod from 'zod';

type TypeHint = {
    key: string,
    value: any,
};

const REVIEW_STATES = 'review-states';
const ReviewStateValidator = zod.object({
    key: zod.literal(REVIEW_STATES),
    value: zod.array(zod.string()),
}).nonstrict();

export class Configuration {
    private _collection: Collection<TypeHint>;

    constructor(mongo: MongoClient) {
        this._collection = mongo.db('gateway')
            .collection('configuration');
    }

    public async addReviewState(id: string): Promise<void> {
        return this._collection.updateOne({
            key: REVIEW_STATES,
        }, {
            // @ts-ignore - this one should be an array, and if not it will fail
            $addToSet: {
                value: id,
            },
        }, {
            upsert: true,
        });
    }

    public async removeReviewState(id: string): Promise<void> {
        return this._collection.updateOne({
            key: REVIEW_STATES,
        }, {
            $pull: {
                // @ts-ignore - this one should be an array, and if not it will fail
                value: id,
            },
        }, {
            upsert: true,
        });
    }

    public async getReviewStates(): Promise<string[]> {
        const values = await this._collection.findOne({
            key: REVIEW_STATES,
        });

        if (values === undefined) {
            await this._collection.insertOne({
                key: REVIEW_STATES,
                value: [],
            });
            return [];
        }

        const validate = ReviewStateValidator.safeParse(values);
        if (!validate.success) {
            console.warn('Failed to load review states as the record is corrupted - resetting', validate.error);
            await this._collection.updateOne({
                key: REVIEW_STATES,
            }, {
                $set: {
                    value: [],
                },
            });
            return [];
        }

        return validate.data.value;
    }
}
