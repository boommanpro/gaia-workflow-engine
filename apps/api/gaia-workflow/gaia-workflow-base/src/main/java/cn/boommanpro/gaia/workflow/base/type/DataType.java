package cn.boommanpro.gaia.workflow.base.type;

public enum DataType {
    Object("Object"),
    Integer("integer"),
    String("String"),
    Number("Number"),
    Boolean("Boolean"),
    File("File"),
    Array_Object("Array<Object>"),
    Array_String("Array<String>"),
    Array_Number("Array<Number>"),
    Array_Boolean("Array<Boolean>"),
    Array_File("Array<File>");

    private final String value;

    private DataType(String value) {
        this.value = value;
    }

    public String getValue() {
        return this.value;
    }

    public String toString() {
        return this.value;
    }

    public static DataType ofValue(String value) {
        for(DataType type : values()) {
            if (type.value.equalsIgnoreCase(value)) {
                return type;
            }
        }

        return null;
    }
}
