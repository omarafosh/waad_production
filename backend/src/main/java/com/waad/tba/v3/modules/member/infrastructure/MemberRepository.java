package com.waad.tba.v3.modules.member.infrastructure;

import com.waad.tba.v3.core.base.infrastructure.BaseRepository;
import com.waad.tba.v3.modules.member.domain.Member;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface MemberRepository extends BaseRepository<Member, Long> {

    Optional<Member> findByCardNumber(String cardNumber);

    Optional<Member> findByCivilId(String civilId);

    Optional<Member> findByBarcode(String barcode);
}
