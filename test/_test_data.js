exports.doc1 = {
  _id: '1',
  meta_access: ['u|mike', 'test', 'invalid']
};
exports.doc2 = {
  _id: '2',
  meta_access: ['u|mike', 'test',]
};
exports.doc3 = {
  _id: '3',
  meta_access: ['u|mike']
  
};

exports.doc4 = {
  _id: '4',
  meta_access: []
};

exports.mike = {
  name: 'mike',
  meta_access: {
    read: {
      r: true,
      w: false
    },
    write: {
      r: true,
      w: true
    },
    secret: {
      r: false,
      w: false
    },
    invalid: {

    }
  }
}
exports.test1 = {
  name: 'test',
  meta_access: {
    test: {
      r: true,
      w: true
    },
    invalid: {
      r: true,
      w: true
    }
  }
}
exports.test2 = {
  name: 'test',
  meta_access: {
    test: {
      r: true,
      w: false
    },
    invalid: {

    }
  }
}
exports.test3 = {
  name: 'test',
  meta_access: {
    test: {
      r: false,
      w: false
    },
    invalid: {

    }
  }
}
exports.test4 = {
  name: 'test',
  meta_access: {
    invalid: {

    }
  }
}