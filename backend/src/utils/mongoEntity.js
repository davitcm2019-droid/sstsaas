const mongoose = require('mongoose');

const normalizeRefId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const mapMongoEntity = (doc) => {
  if (!doc) return null;

  const plain = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const { _id, __v, ...rest } = plain;

  return {
    id: _id?.toString(),
    ...rest
  };
};

module.exports = {
  normalizeRefId,
  isValidObjectId,
  mapMongoEntity
};
