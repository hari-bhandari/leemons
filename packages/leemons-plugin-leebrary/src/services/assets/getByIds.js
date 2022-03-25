/* eslint-disable no-param-reassign */
const { isEmpty, flatten, map, find } = require('lodash');
const { tables } = require('../tables');
const { getByAssets: getPermissions } = require('../permissions/getByAssets');

async function getByIds(assetsIds, { withFiles, checkPermissions, userSession, transacting } = {}) {
  const ids = flatten([assetsIds]);
  let assets = await tables.assets.find({ id_$in: ids }, { transacting });

  if (checkPermissions && userSession) {
    const privateAssets = await getPermissions(assetsIds, { userSession, transacting });
    const permissions = privateAssets.map((item) => item.asset);
    assets = assets.filter((asset) => permissions.includes(asset.id));
  }

  if (!isEmpty(assets) && withFiles) {
    const assetsFiles = await tables.assetsFiles.find({ asset_$in: ids }, { transacting });
    const files = await tables.files.find({ id_$in: map(assetsFiles, 'file') }, { transacting });
    assets = assets.map((asset) => {
      const items = assetsFiles
        .filter((assetFile) => assetFile.asset === asset.id)
        .map((assetFile) => find(files, { id: assetFile.file }));

      if (!isEmpty(items)) {
        if (asset.cover) {
          asset.cover = find(items, { id: asset.cover });
          asset.file =
            items.length > 1 ? items.filter((item) => item.id !== asset.cover) : items[0];
        } else {
          [asset.file] = items;
        }
      }

      return asset;
    });
  }
  return assets;
}

module.exports = { getByIds };
