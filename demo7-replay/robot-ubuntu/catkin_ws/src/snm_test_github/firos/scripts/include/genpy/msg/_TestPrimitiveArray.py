"""autogenerated by genpy from genpy/TestPrimitiveArray.msg. Do not edit."""
import sys
python3 = True if sys.hexversion > 0x03000000 else False
import genpy
import struct


class TestPrimitiveArray(genpy.Message):
  _md5sum = "967cfe360901d64005cbd5a83593b144"
  _type = "genpy/TestPrimitiveArray"
  _has_header = False #flag to mark the presence of a Header object
  _full_text = """int32[] ints
int32[4] fixed_ints
string[] strings
string[4] fixed_strings

"""
  __slots__ = ['ints','fixed_ints','strings','fixed_strings']
  _slot_types = ['int32[]','int32[4]','string[]','string[4]']

  def __init__(self, *args, **kwds):
    """
    Constructor. Any message fields that are implicitly/explicitly
    set to None will be assigned a default value. The recommend
    use is keyword arguments as this is more robust to future message
    changes.  You cannot mix in-order arguments and keyword arguments.

    The available fields are:
       ints,fixed_ints,strings,fixed_strings

    :param args: complete set of field values, in .msg order
    :param kwds: use keyword arguments corresponding to message field names
    to set specific fields.
    """
    if args or kwds:
      super(TestPrimitiveArray, self).__init__(*args, **kwds)
      #message fields cannot be None, assign default values for those that are
      if self.ints is None:
        self.ints = []
      if self.fixed_ints is None:
        self.fixed_ints = [0,0,0,0]
      if self.strings is None:
        self.strings = []
      if self.fixed_strings is None:
        self.fixed_strings = ['','','','']
    else:
      self.ints = []
      self.fixed_ints = [0,0,0,0]
      self.strings = []
      self.fixed_strings = ['','','','']

  def _get_types(self):
    """
    internal API method
    """
    return self._slot_types

  def serialize(self, buff):
    """
    serialize message into buffer
    :param buff: buffer, ``StringIO``
    """
    try:
      length = len(self.ints)
      buff.write(_struct_I.pack(length))
      pattern = '<%si'%length
      buff.write(struct.pack(pattern, *self.ints))
      buff.write(_struct_4i.pack(*self.fixed_ints))
      length = len(self.strings)
      buff.write(_struct_I.pack(length))
      for val1 in self.strings:
        length = len(val1)
        if python3 or type(val1) == unicode:
          val1 = val1.encode('utf-8')
          length = len(val1)
        buff.write(struct.pack('<I%ss'%length, length, val1))
      for val1 in self.fixed_strings:
        length = len(val1)
        if python3 or type(val1) == unicode:
          val1 = val1.encode('utf-8')
          length = len(val1)
        buff.write(struct.pack('<I%ss'%length, length, val1))
    except struct.error as se: self._check_types(se)
    except TypeError as te: self._check_types(te)

  def deserialize(self, str):
    """
    unpack serialized message in str into this message instance
    :param str: byte array of serialized message, ``str``
    """
    try:
      end = 0
      start = end
      end += 4
      (length,) = _struct_I.unpack(str[start:end])
      pattern = '<%si'%length
      start = end
      end += struct.calcsize(pattern)
      self.ints = struct.unpack(pattern, str[start:end])
      start = end
      end += 16
      self.fixed_ints = _struct_4i.unpack(str[start:end])
      start = end
      end += 4
      (length,) = _struct_I.unpack(str[start:end])
      self.strings = []
      for i in range(0, length):
        start = end
        end += 4
        (length,) = _struct_I.unpack(str[start:end])
        start = end
        end += length
        if python3:
          val1 = str[start:end].decode('utf-8')
        else:
          val1 = str[start:end]
        self.strings.append(val1)
      self.fixed_strings = []
      for i in range(0, 4):
        start = end
        end += 4
        (length,) = _struct_I.unpack(str[start:end])
        start = end
        end += length
        if python3:
          val1 = str[start:end].decode('utf-8')
        else:
          val1 = str[start:end]
        self.fixed_strings.append(val1)
      return self
    except struct.error as e:
      raise genpy.DeserializationError(e) #most likely buffer underfill


  def serialize_numpy(self, buff, numpy):
    """
    serialize message with numpy array types into buffer
    :param buff: buffer, ``StringIO``
    :param numpy: numpy python module
    """
    try:
      length = len(self.ints)
      buff.write(_struct_I.pack(length))
      pattern = '<%si'%length
      buff.write(self.ints.tostring())
      buff.write(self.fixed_ints.tostring())
      length = len(self.strings)
      buff.write(_struct_I.pack(length))
      for val1 in self.strings:
        length = len(val1)
        if python3 or type(val1) == unicode:
          val1 = val1.encode('utf-8')
          length = len(val1)
        buff.write(struct.pack('<I%ss'%length, length, val1))
      for val1 in self.fixed_strings:
        length = len(val1)
        if python3 or type(val1) == unicode:
          val1 = val1.encode('utf-8')
          length = len(val1)
        buff.write(struct.pack('<I%ss'%length, length, val1))
    except struct.error as se: self._check_types(se)
    except TypeError as te: self._check_types(te)

  def deserialize_numpy(self, str, numpy):
    """
    unpack serialized message in str into this message instance using numpy for array types
    :param str: byte array of serialized message, ``str``
    :param numpy: numpy python module
    """
    try:
      end = 0
      start = end
      end += 4
      (length,) = _struct_I.unpack(str[start:end])
      pattern = '<%si'%length
      start = end
      end += struct.calcsize(pattern)
      self.ints = numpy.frombuffer(str[start:end], dtype=numpy.int32, count=length)
      start = end
      end += 16
      self.fixed_ints = numpy.frombuffer(str[start:end], dtype=numpy.int32, count=4)
      start = end
      end += 4
      (length,) = _struct_I.unpack(str[start:end])
      self.strings = []
      for i in range(0, length):
        start = end
        end += 4
        (length,) = _struct_I.unpack(str[start:end])
        start = end
        end += length
        if python3:
          val1 = str[start:end].decode('utf-8')
        else:
          val1 = str[start:end]
        self.strings.append(val1)
      self.fixed_strings = []
      for i in range(0, 4):
        start = end
        end += 4
        (length,) = _struct_I.unpack(str[start:end])
        start = end
        end += length
        if python3:
          val1 = str[start:end].decode('utf-8')
        else:
          val1 = str[start:end]
        self.fixed_strings.append(val1)
      return self
    except struct.error as e:
      raise genpy.DeserializationError(e) #most likely buffer underfill

_struct_I = genpy.struct_I
_struct_4i = struct.Struct("<4i")
