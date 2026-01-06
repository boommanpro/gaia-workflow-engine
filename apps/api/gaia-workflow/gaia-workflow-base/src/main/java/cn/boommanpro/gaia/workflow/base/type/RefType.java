package cn.boommanpro.gaia.workflow.base.type;

import lombok.AllArgsConstructor;
import lombok.Getter;

@AllArgsConstructor
@Getter
public enum RefType {
    REF("ref"),
    CONSTANT("constant"),
    ;

    private final String value;

    public static RefType from(String type) {
        //
        for (RefType refType : RefType.values()) {
            if (refType.value.equals(type)) {
                return refType;
            }
        }
        return null;
    }
}
