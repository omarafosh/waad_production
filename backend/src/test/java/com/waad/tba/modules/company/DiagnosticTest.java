package com.waad.tba.modules.company;

import com.waad.tba.modules.company.dto.SettingDto;
import com.waad.tba.modules.company.entity.Setting;
import com.waad.tba.common.entity.Organization;

public class DiagnosticTest {
    public void diagnostic() {
        SettingDto dto = new SettingDto();
        Setting setting = new Setting();
        Organization org = new Organization();
        System.out.println("Diagnostic Success");
    }
}
